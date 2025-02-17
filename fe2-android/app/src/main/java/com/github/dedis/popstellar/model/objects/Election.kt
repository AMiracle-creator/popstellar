package com.github.dedis.popstellar.model.objects

import com.github.dedis.popstellar.model.Copyable.Companion.copyMapOfList
import com.github.dedis.popstellar.model.Copyable.Companion.copyMapOfSet
import com.github.dedis.popstellar.model.Immutable
import com.github.dedis.popstellar.model.network.method.message.data.election.ElectionQuestion
import com.github.dedis.popstellar.model.network.method.message.data.election.ElectionVersion
import com.github.dedis.popstellar.model.network.method.message.data.election.EncryptedVote
import com.github.dedis.popstellar.model.network.method.message.data.election.PlainVote
import com.github.dedis.popstellar.model.network.method.message.data.election.QuestionResult
import com.github.dedis.popstellar.model.network.method.message.data.election.Vote
import com.github.dedis.popstellar.model.objects.Channel.Companion.getLaoChannel
import com.github.dedis.popstellar.model.objects.event.Event
import com.github.dedis.popstellar.model.objects.event.EventState
import com.github.dedis.popstellar.model.objects.event.EventType
import com.github.dedis.popstellar.model.objects.security.Base64URLData
import com.github.dedis.popstellar.model.objects.security.MessageID
import com.github.dedis.popstellar.model.objects.security.PublicKey
import com.github.dedis.popstellar.model.objects.security.elGamal.ElectionPublicKey
import com.github.dedis.popstellar.utility.security.HashSHA256.hash
import java.util.Objects

@Immutable
@Suppress("LongParameterList")
class Election(
    id: String,
    name: String,
    creation: Long,
    channel: Channel,
    start: Long,
    end: Long,
    electionQuestions: List<ElectionQuestion>,
    electionKey: String?,
    electionVersion: ElectionVersion,
    votesBySender: Map<PublicKey, List<Vote>>,
    messageMap: Map<PublicKey, MessageID>,
    state: EventState?,
    results: Map<String, Set<QuestionResult>>
) : Event() {
  val channel: Channel
  val id: String
  val creation: Long

  override val name: String
  override val startTimestamp: Long
  override val endTimestamp: Long
  override val state: EventState?

  override val type: EventType
    get() = EventType.ELECTION

  // Election public key is generated via Kyber and is encoded in Base64
  // decoding it is required before actually starting using it
  val electionKey: String?

  // Either OPEN_BALLOT or SECRET_BALLOT
  val electionVersion: ElectionVersion

  val electionQuestions: List<ElectionQuestion>
    get() = ArrayList(field)

  // Map that associates each sender pk to their votes
  val votesBySender: Map<PublicKey, List<Vote>>
    get() = copyMapOfList(field)

  // Map that associates each messageId to its sender
  val messageMap: Map<PublicKey, MessageID>
    get() = HashMap(field)

  // Results of an election (associated to a question id)
  val results: Map<String, Set<QuestionResult>>
    get() = copyMapOfSet(field)

  init {
    // Make sure the vote are encrypted in a secret election and plain in an open election
    validateVotesTypes(votesBySender, electionVersion)

    this.id = id
    this.name = name
    this.creation = creation
    this.channel = channel
    startTimestamp = start
    endTimestamp = end
    this.state = state
    this.electionKey = electionKey
    this.electionVersion = electionVersion

    // Defensive copies
    this.electionQuestions = ArrayList(electionQuestions)
    this.votesBySender = copyMapOfList(votesBySender)
    this.results = copyMapOfSet(results)
    this.messageMap = HashMap(messageMap)
  }

  val creationInMillis: Long
    get() = creation * 1000

  fun getResultsForQuestionId(id: String): Set<QuestionResult>? {
    return results[id]
  }

  /**
   * Computes the hash for the registered votes, when terminating an election (sorted by message
   * id's alphabetical order)
   *
   * @return the hash of all registered votes
   */
  @Suppress("SpreadOperator")
  fun computeRegisteredVotesHash(): String {
    val ids = messageMap.keys.flatMap { votesBySender[it] ?: emptyList() }.map(Vote::id).sorted()

    return if (ids.isEmpty()) {
      ""
    } else {
      hash(*ids.toTypedArray())
    }
  }

  /**
   * Encrypts the content of the votes using El-GamaL scheme
   *
   * @param votes list of votes to encrypt
   * @return encrypted votes
   */
  fun encrypt(votes: List<PlainVote>): List<EncryptedVote> {
    // We need to iterate over all election votes to encrypt them
    val encryptedVotes: MutableList<EncryptedVote> = ArrayList()

    for (vote in votes) {
      // We are sure that each vote is unique per question following new specification
      val voteIndice = vote.vote!!

      // Get the two lsb byte from the indice
      val voteIndiceInBytes = byteArrayOf((voteIndice shr 8).toByte(), voteIndice.toByte())

      // Create a public key and encrypt the indice
      val electionKeyToBase64 = Base64URLData(electionKey!!)
      val key = ElectionPublicKey(electionKeyToBase64)

      // Encrypt the indice
      val encryptedVotesIndice = key.encrypt(voteIndiceInBytes)
      val encryptedVote = EncryptedVote(vote.questionId, encryptedVotesIndice, false, null, id)
      encryptedVotes.add(encryptedVote)
    }

    return encryptedVotes
  }

  override fun equals(other: Any?): Boolean {
    if (this === other) {
      return true
    }
    if (other == null || javaClass != other.javaClass) {
      return false
    }
    val election = other as Election
    return creation == election.creation &&
        startTimestamp == election.startTimestamp &&
        endTimestamp == election.endTimestamp &&
        channel == election.channel &&
        id == election.id &&
        name == election.name &&
        electionQuestions == election.electionQuestions &&
        electionKey == election.electionKey &&
        electionVersion === election.electionVersion &&
        votesBySender == election.votesBySender &&
        messageMap == election.messageMap &&
        state === election.state &&
        results == election.results
  }

  override fun hashCode(): Int {
    return Objects.hash(
        channel,
        id,
        name,
        creation,
        startTimestamp,
        endTimestamp,
        electionQuestions,
        electionKey,
        electionVersion,
        votesBySender,
        messageMap,
        state,
        results)
  }

  override fun toString(): String {
    return "Election{channel='$channel', id='$id', name='$name', creation=$creation, start=$startTimestamp, end=$endTimestamp, electionQuestions=${
      electionQuestions.toTypedArray().contentToString()
    }, voteMap=$votesBySender, messageMap=$messageMap, state=$state, results=$results}"
  }

  fun builder(): ElectionBuilder {
    return ElectionBuilder(this)
  }

  class ElectionBuilder {
    private val id: String
    private var name: String
    private val creation: Long
    private val channel: Channel
    private var start: Long = 0
    private var end: Long = 0
    private var electionQuestions: List<ElectionQuestion>
    private var electionKey: String? = null
    private var electionVersion: ElectionVersion? = null
    private val votesBySender: MutableMap<PublicKey, List<Vote>>
    private val messageMap: MutableMap<PublicKey, MessageID>
    private var state: EventState? = null
    private var results: Map<String, Set<QuestionResult>>

    /**
     * This is a special builder that can be used to generate the default values of an election
     * being created for the first time
     *
     * @param laoId id of the LAO
     * @param creation time
     * @param name of the election
     */
    constructor(laoId: String, creation: Long, name: String) {
      this.id = generateElectionSetupId(laoId, creation, name)
      this.name = name
      this.creation = creation
      this.channel = getLaoChannel(laoId).subChannel(id)
      this.results = HashMap()
      this.electionQuestions = ArrayList()
      this.votesBySender = HashMap()
      this.messageMap = HashMap()
    }

    constructor(election: Election) {
      channel = election.channel
      id = election.id
      name = election.name
      creation = election.creation
      start = election.startTimestamp
      end = election.endTimestamp
      electionKey = election.electionKey
      electionQuestions = election.electionQuestions
      electionVersion = election.electionVersion

      // We might modify the maps, for safety reason, we need to create a copy
      votesBySender = HashMap(election.votesBySender)
      messageMap = HashMap(election.messageMap)
      state = election.state
      results = election.results
    }

    fun setName(name: String): ElectionBuilder {
      this.name = name
      return this
    }

    fun setStart(start: Long): ElectionBuilder {
      this.start = start
      return this
    }

    fun setEnd(end: Long): ElectionBuilder {
      this.end = end
      return this
    }

    fun setElectionQuestions(electionQuestions: List<ElectionQuestion>): ElectionBuilder {
      this.electionQuestions = electionQuestions
      return this
    }

    fun setElectionKey(electionKey: String): ElectionBuilder {
      this.electionKey = electionKey
      return this
    }

    fun setElectionVersion(electionVersion: ElectionVersion): ElectionBuilder {
      this.electionVersion = electionVersion
      return this
    }

    fun updateVotes(senderPk: PublicKey, votes: List<Vote>): ElectionBuilder {
      votesBySender[senderPk] = ArrayList(votes)
      return this
    }

    fun updateMessageMap(senderPk: PublicKey, messageID: MessageID): ElectionBuilder {
      messageMap[senderPk] = messageID
      return this
    }

    fun setState(state: EventState): ElectionBuilder {
      this.state = state
      return this
    }

    fun setResults(results: Map<String, Set<QuestionResult>>): ElectionBuilder {
      this.results = results
      return this
    }

    fun build(): Election {
      checkNotNull(electionVersion) { "Election version is null " }
      return Election(
          id,
          name,
          creation,
          channel,
          start,
          end,
          electionQuestions,
          electionKey,
          electionVersion!!,
          votesBySender,
          messageMap,
          state,
          results)
    }
  }

  companion object {
    private fun validateVotesTypes(
        votesBySender: Map<PublicKey, List<Vote>>,
        version: ElectionVersion?
    ) {
      votesBySender.values
          .stream()
          .flatMap { obj: List<Vote> -> obj.stream() }
          .forEach { vote: Vote -> validateVoteType(vote, version) }
    }

    private fun validateVoteType(vote: Vote, version: ElectionVersion?) {
      val isElectionEncrypted = version === ElectionVersion.SECRET_BALLOT
      if (vote.isEncrypted != isElectionEncrypted) {
        require(!vote.isEncrypted) { "Provided an encrypted vote in an open ballot election" }
        throw IllegalArgumentException("Provided an plain vote in a secret ballot election")
      }
    }

    /**
     * Generate the id for dataElectionSetup.
     * https://github.com/dedis/popstellar/blob/master/protocol/query/method/message/data/dataElectionSetup.json
     *
     * @param laoId ID of the LAO
     * @param createdAt creation time of the election
     * @param name name of the election
     * @return the ID of ElectionSetup computed as Hash('Election'||lao_id||created_at||name)
     */
    @JvmStatic
    fun generateElectionSetupId(laoId: String?, createdAt: Long, name: String?): String {
      return hash(EventType.ELECTION.suffix, laoId, createdAt.toString(), name)
    }

    /**
     * Generate the id for a question of dataElectionSetup and dataElectionResult.
     * https://github.com/dedis/popstellar/blob/master/protocol/query/method/message/data/dataElectionSetup.json
     * https://github.com/dedis/popstellar/blob/master/protocol/query/method/message/data/dataElectionResult.json
     *
     * @param electionId ID of the Election
     * @param question question of the Election
     * @return the ID of an election question computed as Hash(“Question”||election_id||question)
     */
    @JvmStatic
    fun generateElectionQuestionId(electionId: String?, question: String?): String {
      return hash("Question", electionId, question)
    }

    /**
     * Generate the id for a vote of dataCastVote.
     * https://github.com/dedis/popstellar/blob/master/protocol/query/method/message/data/dataCastVote.json
     *
     * @param electionId ID of the Election
     * @param questionId ID of the Election question
     * @param voteIndex index(es) of the vote
     * @param writeIn string representing the write in
     * @param writeInEnabled boolean representing if write enabled or not
     * @return the ID of an election question computed as
     *   Hash('Vote'||election_id||question_id||(vote_index(es)|write_in))
     */
    @JvmStatic
    fun generateElectionVoteId(
        electionId: String?,
        questionId: String?,
        voteIndex: Int?,
        writeIn: String?,
        writeInEnabled: Boolean
    ): String {
      // If write_in is enabled the id is formed with the write_in string
      // If write_in is not enabled the id is formed with the vote indexes (formatted as int1, int2,
      // ). The vote are concatenated and brackets are removed from the array toString
      // representation
      return hash(
          "Vote", electionId, questionId, if (writeInEnabled) writeIn else voteIndex.toString())
    }

    /**
     * Generate the id for a vote of dataCastVote.
     * https://github.com/dedis/popstellar/blob/master/protocol/query/method/message/data/dataCastVote.json
     *
     * @param electionId ID of the Election
     * @param questionId ID of the Election question
     * @param voteIndexEncrypted index(es) of the vote
     * @param writeInEncrypted string representing the write in
     * @param writeInEnabled boolean representing if write enabled or not
     * @return the ID of an election question computed as
     *   Hash('Vote'||election_id||question_id||(encrypted_vote_index(es)|encrypted_write_in))
     */
    @JvmStatic
    fun generateEncryptedElectionVoteId(
        electionId: String?,
        questionId: String?,
        voteIndexEncrypted: String?,
        writeInEncrypted: String?,
        writeInEnabled: Boolean
    ): String {
      // HashLen('Vote', election_id, question_id, (encrypted_vote_index|encrypted_write_in))),
      // concatenate vote indexes - must sort in alphabetical order and use delimiter ','"
      return hash(
          "Vote",
          electionId,
          questionId,
          if (writeInEnabled) writeInEncrypted else voteIndexEncrypted)
    }
  }
}
