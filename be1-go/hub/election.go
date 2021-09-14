package hub

import (
	"encoding/base64"
	"log"
	"student20_pop/crypto"
	"student20_pop/message/answer"
	"student20_pop/message/messagedata"
	"student20_pop/message/query/method"
	"student20_pop/message/query/method/message"
	"sync"

	"golang.org/x/xerrors"
)

// Attendees represents the attendees in an election.
type Attendees struct {
	sync.Mutex
	store map[string]struct{}
}

// NewAttendees returns a new instance of Attendees.
func NewAttendees() *Attendees {
	return &Attendees{
		store: make(map[string]struct{}),
	}
}

// IsPresent checks if a key representing a user is present in
// the list of attendees.
func (a *Attendees) IsPresent(key string) bool {
	a.Lock()
	defer a.Unlock()

	_, ok := a.store[key]
	return ok
}

// Add adds an attendee to the election.
func (a *Attendees) Add(key string) {
	a.Lock()
	defer a.Unlock()

	a.store[key] = struct{}{}
}

// Copy deep copies the Attendees struct.
func (a *Attendees) Copy() *Attendees {
	a.Lock()
	defer a.Unlock()

	clone := NewAttendees()

	for key := range a.store {
		clone.store[key] = struct{}{}
	}

	return clone
}

// electionChannel is used to handle election messages.
type electionChannel struct {
	*baseChannel

	// Starting time of the election
	start int64

	// Ending time of the election
	end int64

	// True if the election is over and false otherwise
	terminated bool

	// Questions asked to the participants
	//the key will be the string representation of the id of type byte[]
	questions map[string]question

	// attendees that took part in the roll call string of their PK
	attendees *Attendees
}

// question represents a question in an election.
type question struct {
	// ID represents the id of the question.
	id []byte

	// ballotOptions represents different ballot options.
	ballotOptions []string

	//valid vote mutex.
	validVotesMu sync.RWMutex

	// validVotes represents the list of all valid votes. The key represents
	// the public key of the person casting the vote.
	validVotes map[string]validVote

	// method represents the voting method of the election. Either "Plurality"
	// or "Approval".
	method string
}

type validVote struct {
	// voteTime represents the time of the creation of the vote.
	voteTime int64

	// indexes represents the indexes of the ballot options
	indexes []int
}

// createElection creates an election in the LAO.
func (c *laoChannel) createElection(msg message.Message, setupMsg messagedata.ElectionSetup) error {
	organizerHub := c.hub

	organizerHub.Lock()
	defer organizerHub.Unlock()

	// Check if the Lao ID of the message corresponds to the channel ID
	channelID := c.channelID[6:]
	if channelID != setupMsg.Lao {
		return answer.NewErrorf(-4, "Lao ID of the message (Lao: %s) is different from the channelID (channel: %s)", setupMsg.Lao, channelID)
	}

	// Compute the new election channel id
	channelPath := rootPrefix + setupMsg.Lao + "/" + setupMsg.ID

	// Create the new election channel
	electionCh := electionChannel{
		createBaseChannel(organizerHub, channelPath),
		setupMsg.StartTime,
		setupMsg.EndTime,
		false,
		getAllQuestionsForElectionChannel(setupMsg.Questions),
		c.attendees,
	}

	// Saving the election channel creation message on the lao channel
	c.inbox.storeMessage(msg)

	// Saving on election channel too so it self-contains the entire election history
	electionCh.inbox.storeMessage(msg)

	// Add the new election channel to the organizerHub
	organizerHub.channelByID[channelPath] = &electionCh

	return nil
}

// Publish is used to handle publish messages in the election channel.
func (c *electionChannel) Publish(publish method.Publish) error {
	err := c.baseChannel.VerifyPublishMessage(publish)
	if err != nil {
		return xerrors.Errorf("failed to verify publish message on an election channel: %w", err)
	}

	msg := publish.Params.Message

	data := msg.Data

	jsonData, err := base64.URLEncoding.DecodeString(data)
	if err != nil {
		return xerrors.Errorf("failed to decode message data: %v", err)
	}

	object, action, err := messagedata.GetObjectAndAction(jsonData)

	if object == "election" {

		switch action {
		case "cast_vote":
			var castVote messagedata.VoteCastVote

			err := msg.UnmarshalData(&castVote)
			if err != nil {
				return xerrors.Errorf("failed to unmarshal cast vote: %v", err)
			}

			err = c.castVoteHelper(msg, castVote)
			if err != nil {
				return xerrors.Errorf("failed to cast vote: %v", err)
			}
		case "end":
			log.Fatal("Not implemented election#end")
		case "result":
			log.Fatal("Not implemented election#result")
		default:
			return answer.NewInvalidActionError(action)
		}
	}

	if err != nil {
		return xerrors.Errorf("failed to process %q action: %w", action, err)
	}

	c.broadcastToAllClients(msg)

	return nil
}

func (c *electionChannel) castVoteHelper(msg message.Message, voteMsg messagedata.VoteCastVote) error {

	if voteMsg.CreatedAt > c.end {
		return answer.NewErrorf(-4, "Vote cast too late, vote casted at %v and election ended at %v", voteMsg.CreatedAt, c.end)
	}

	log.Printf("The sender pk is %s", msg.Sender)

	senderPoint := crypto.Suite.Point()
	err := senderPoint.UnmarshalBinary([]byte(msg.Sender))
	if err != nil {
		return answer.NewError(-4, "Invalid sender public key")
	}

	log.Printf("All the valid pks are %v and %v", c.attendees, senderPoint)

	ok := c.attendees.IsPresent(msg.Sender) || c.hub.public.Equal(senderPoint)
	if !ok {
		return answer.NewError(-4, "Only attendees can cast a vote in an election")
	}

	//This should update any previously set vote if the message ids are the same
	c.inbox.storeMessage(msg)
	for _, q := range voteMsg.Votes {

		qs, ok := c.questions[q.ID]

		if !ok {
			return answer.NewErrorf(-4, "No Question with ID %q exists", q.ID)
		}

		// this is to handle the case when the organizer must handle multiple votes being cast at the same time
		qs.validVotesMu.Lock()
		earlierVote, ok := qs.validVotes[msg.Sender]

		// if the sender didn't previously cast a vote or if the vote is no longer valid update it
		if err := checkMethodProperties(qs.method, len(q.Vote)); err != nil {
			return xerrors.Errorf("failed to validate voting method props: %w", err)
		}

		if !ok {
			qs.validVotes[msg.Sender] = validVote{
				voteMsg.CreatedAt,
				q.Vote,
			}
		} else {
			changeVote(&qs, earlierVote, msg.Sender, voteMsg.CreatedAt, q.Vote)
		}

		//other votes can now change the list of valid votes
		qs.validVotesMu.Unlock()
	}

	log.Printf("Vote casted with success")
	return nil
}

func checkMethodProperties(method string, length int) error {
	if method == "Plurality" && length < 1 {
		return answer.NewError(-4, "No ballot option was chosen for plurality voting method")
	}
	if method == "Approval" && length != 1 {
		return answer.NewError(-4, "Cannot choose multiple ballot options on approval voting method")
	}
	return nil
}

func changeVote(qs *question, earlierVote validVote, sender string, created int64, indexes []int) {
	if earlierVote.voteTime > created {
		qs.validVotes[sender] =
			validVote{
				voteTime: created,
				indexes:  indexes,
			}
	}
}

func getAllQuestionsForElectionChannel(questions []messagedata.ElectionSetupQuestion) map[string]question {

	qs := make(map[string]question)
	for _, q := range questions {
		ballotOpts := make([]string, len(q.BallotOptions))
		for i, b := range q.BallotOptions {
			ballotOpts[i] = b
		}

		qs[q.ID] = question{
			id:            []byte(q.ID),
			ballotOptions: ballotOpts,
			validVotesMu:  sync.RWMutex{},
			validVotes:    make(map[string]validVote),
			method:        q.VotingMethod,
		}
	}
	return qs
}
