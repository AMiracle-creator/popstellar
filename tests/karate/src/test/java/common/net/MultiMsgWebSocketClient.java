package common.net;

import be.utils.JsonConverter;
import be.model.KeyPair;
import be.utils.RandomUtils;
import com.intuit.karate.Json;
import com.intuit.karate.Logger;
import com.intuit.karate.http.WebSocketClient;
import com.intuit.karate.http.WebSocketOptions;

import java.util.*;
import java.util.function.Predicate;

/** A WebSocketClient that can handle multiple received messages */
public class MultiMsgWebSocketClient extends WebSocketClient {

  public String publicKey;
  public String privateKey;
  public JsonConverter jsonConverter;
  private final MessageQueue queue;
  public final Logger logger;

  /** Map of all the messages and their corresponding message ids that the client sent */
  private final HashMap<String, Integer> sentMessages = new HashMap<>();
  /** Collects all broadcasts that were received */
  public ArrayList<String> receivedBroadcasts = new ArrayList<>();

  private final static int TIMEOUT = 5000;


  public MultiMsgWebSocketClient(WebSocketOptions options, Logger logger, MessageQueue queue) {
    super(options, logger);
    this.logger = logger;
    this.queue = queue;

    KeyPair keyPair = new KeyPair();
    this.publicKey = keyPair.getPublicKey();
    this.privateKey = keyPair.getPrivateKey();
    this.jsonConverter = new JsonConverter(publicKey, privateKey);
    System.out.println("Created a MultiMsgWebSocketClient using publicKey: " + publicKey + " and private key: " + privateKey);

    setTextHandler(m -> true);
  }

  /**
   * JSON messages defined inside features are interpreted as maps from String to Object.
   * This method is called directly inside features and is just a wrapper around the send method of WebsocketClient (that takes Strings).
   * @param messageData the message to send as a JSON map
   *                    (for example: subscribe and catchup in simpleScenarios.feature).
   */
  public void send(Map<String, Object> messageData){
    this.send(mapToJsonString(messageData));
  }

  /**
   * JSON messages defined inside features are interpreted as maps from String to Object.
   * This method is called directly inside features to send a complete publish message given the high-level message data to publish.
   * @param highLevelMessageDataMap the high-level message to publish as a JSON map
   *                                (for example: validCreateRollCall and badCreateRollCall in createRollCall.feature).
   * @param channel the channel to publish on.
   */
  public void publish(Map<String, Object> highLevelMessageDataMap, String channel){
    String highLevelMessageData = mapToJsonString(highLevelMessageDataMap);
    int messageId = new Random().nextInt(Integer.MAX_VALUE);
    sentMessages.put(highLevelMessageData, messageId);
    Json publishMessageJson =  jsonConverter.constructPublishMessage(highLevelMessageData, messageId, channel);
    String publishMessage = publishMessageJson.toString();
    System.out.println("The complete publish message sent is : " + publishMessage);
    this.send(publishMessage);
  }

  /**
   * Waits to receive the backend answer to a given message and returns the answer.
   * @param highLevelMessageDataMap of the message that the answer is expected for.
   * @return the answer to the given message or throws an error if there is none.
   */
  public String getBackendResponse(Map<String, Object> highLevelMessageDataMap){
    String highLevelMessageData = mapToJsonString(highLevelMessageDataMap);
    assert sentMessages.containsKey(highLevelMessageData);
    int messageId = sentMessages.get(highLevelMessageData);

    String answer = getBuffer().takeTimeout(TIMEOUT);
    while(answer != null){
      if(answer.contains("result") || answer.contains("error")){
        Json resultJson = Json.of(answer);
        int resultId = resultJson.get("id");
        if (messageId == resultId){
          sentMessages.remove(highLevelMessageData);
          return answer;
        }
      }
      if (answer.contains("broadcast")){
        receivedBroadcasts.add(answer);
      }
      answer = getBuffer().takeTimeout(TIMEOUT);
    }
    assert false;
    throw new IllegalArgumentException("No answer from the backend");
  }

  /**
   * Retrieves all messages with the specified method type from the messages buffer.
   * @param method The method type to filter the messages by.
   * @return A list containing all received messages that match the specified method type.
   */
  public List<String> getMessagesByMethod(String method) {
    List<String> messages = new ArrayList<>();
    Predicate<String> filter = MessageFilters.withMethod(method);

    String message = getBuffer().takeTimeout(TIMEOUT);
    while (message != null) {
      if (filter.test(message)) {
        messages.add(message);
      }
      message = getBuffer().takeTimeout(TIMEOUT);
    }
    return messages;
  }

  public MessageBuffer getBuffer() {
    return queue;
  }

  public boolean receiveNoMoreResponses(){
    String result = getBuffer().takeTimeout(TIMEOUT);
    return result == null;
  }

  /**
   * Set the client to take a timeout of the given length
   * @param timeout the length to timeout
   */
  public void takeTimeout(long timeout){
    getBuffer().takeTimeout(timeout);
  }

  /**
   * Set the client to use a wrong signature when sending messages
   */
  public void useWrongSignature() {
    String wrongSignature = RandomUtils.generateSignature();
    logger.info("setting wrong signature: " + wrongSignature);
    jsonConverter.setSignature(wrongSignature);
  }

  @Override
  public void signal(Object result) {
    logger.trace("signal called: {}", result);
    queue.onNewMsg(result.toString());
  }

  @Override
  public synchronized Object listen(long timeout) {
    logger.trace("entered listen wait state");
    String msg = queue.take();

    if (msg == null) logger.error("listen timed out");

    return msg;
  }

  private String mapToJsonString(Map<String, Object> jsonAsMap){
    return Json.of(jsonAsMap).toString();
  }
}
