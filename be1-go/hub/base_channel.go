package hub

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"student20_pop/message"
	"sync"
	"time"
)

// baseChannel represent a generic channel and contains all the fields that are
// used in all channels
type baseChannel struct {
	hub *organizerHub

	clientsMu sync.RWMutex
	clients   map[*ClientSocket]struct{}

	inboxMu sync.RWMutex
	inbox   map[string]messageInfo

	// /root/<ID>
	channelID string

	witnessMu sync.Mutex
	witnesses []message.PublicKey
}

type messageInfo struct {
	message    message.Message
	storedTime message.Timestamp
}

// CreateBaseChannel return an instance of a `baseChannel`
func createBaseChannel(h *organizerHub, channelID string) *baseChannel {
	return &baseChannel{
		hub:       h,
		channelID: channelID,
		clients:   make(map[*ClientSocket]struct{}),
		inbox:     make(map[string]messageInfo),
	}
}

func (c *baseChannel) Subscribe(client *ClientSocket, msg message.Subscribe) error {
	log.Printf("received a subscribe with id: %d", msg.ID)
	c.clientsMu.Lock()
	defer c.clientsMu.Unlock()

	c.clients[client] = struct{}{}

	return nil
}

func (c *baseChannel) Unsubscribe(client *ClientSocket, msg message.Unsubscribe) error {
	log.Printf("received an unsubscribe with id: %d", msg.ID)

	c.clientsMu.Lock()
	defer c.clientsMu.Unlock()

	if _, ok := c.clients[client]; !ok {
		return &message.Error{
			Code:        -2,
			Description: "client is not subscribed to this channel",
		}
	}

	delete(c.clients, client)
	return nil
}

func (c *baseChannel) Catchup(catchup message.Catchup) []message.Message {
	log.Printf("received a catchup with id: %d", catchup.ID)

	c.inboxMu.RLock()
	defer c.inboxMu.RUnlock()

	messages := make([]messageInfo, 0, len(c.inbox))
	// iterate over map and collect all the values (messageInfo instances)
	for _, msgInfo := range c.inbox {
		messages = append(messages, msgInfo)
		log.Printf("Control: %v", msgInfo.storedTime)
	}

	// sort.Slice on messages based on the timestamp
	sort.Slice(messages, func(i, j int) bool {
		return messages[i].storedTime < messages[j].storedTime
	})

	result := make([]message.Message, 0, len(c.inbox))

	// iterate and extract the messages[i].message field and
	// append it to the result slice
	for _, msgInfo := range messages {
		result = append(result, msgInfo.message)
	}

	return result
}

func (c *baseChannel) storeMessage(msg message.Message) {
	msgIDEncoded := base64.StdEncoding.EncodeToString(msg.MessageID)
	storedTime := message.Timestamp(time.Now().UnixNano())

	messageInfo := messageInfo{
		message:    msg,
		storedTime: storedTime,
	}

	c.inboxMu.Lock()
	c.inbox[msgIDEncoded] = messageInfo
	c.inboxMu.Unlock()
}

func (c *baseChannel) broadcastToAllClients(msg message.Message) {
	c.clientsMu.RLock()
	defer c.clientsMu.RUnlock()

	query := message.Query{
		Broadcast: message.NewBroadcast(c.channelID, &msg),
	}

	buf, err := json.Marshal(query)
	if err != nil {
		log.Fatalf("failed to marshal broadcast query: %v", err)
	}

	for client := range c.clients {
		client.Send(buf)
	}
}

// Verify the if a Publish message is valid
func (c *baseChannel) VerifyPublishMessage(publish message.Publish) error {
	log.Printf("received a publish with id: %d", publish.ID)

	// Check if the structure of the message is correct
	msg := publish.Params.Message

	// Verify the data
	err := c.hub.verifyJson(msg.RawData, DataSchema)
	if err != nil {
		return message.NewError("failed to validate the data", err)
	}

	// Unmarshal the data
	err = msg.VerifyAndUnmarshalData()
	if err != nil {
		// Return a error of type "-4 request data is invalid" for all the verifications and unmarshalling problems of the data
		return &message.Error{
			Code:        -4,
			Description: fmt.Sprintf("failed to verify and unmarshal data: %v", err),
		}
	}

	msgIDEncoded := base64.StdEncoding.EncodeToString(msg.MessageID)

	// Check if the message already exists
	c.inboxMu.RLock()
	if _, ok := c.inbox[msgIDEncoded]; ok {
		c.inboxMu.RUnlock()
		return &message.Error{
			Code:        -3,
			Description: "message already exists",
		}
	}
	c.inboxMu.RUnlock()

	return nil
}
