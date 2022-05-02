package com.github.dedis.popstellar.utility.handler;

import static com.github.dedis.popstellar.testutils.Base64DataUtils.generateKeyPair;
import static com.github.dedis.popstellar.utility.handler.data.LaoHandler.updateLaoNameWitnessMessage;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.github.dedis.popstellar.di.DataRegistryModule;
import com.github.dedis.popstellar.di.JsonModule;
import com.github.dedis.popstellar.model.network.method.message.MessageGeneral;
import com.github.dedis.popstellar.model.network.method.message.data.lao.CreateLao;
import com.github.dedis.popstellar.model.network.method.message.data.lao.GreetLao;
import com.github.dedis.popstellar.model.network.method.message.data.lao.StateLao;
import com.github.dedis.popstellar.model.network.method.message.data.lao.UpdateLao;
import com.github.dedis.popstellar.model.objects.Channel;
import com.github.dedis.popstellar.model.objects.Lao;
import com.github.dedis.popstellar.model.objects.PeerAddress;
import com.github.dedis.popstellar.model.objects.WitnessMessage;
import com.github.dedis.popstellar.model.objects.security.KeyPair;
import com.github.dedis.popstellar.model.objects.security.PublicKey;
import com.github.dedis.popstellar.repository.LAORepository;
import com.github.dedis.popstellar.repository.LAOState;
import com.github.dedis.popstellar.repository.ServerRepository;
import com.github.dedis.popstellar.repository.remote.MessageSender;
import com.github.dedis.popstellar.utility.error.DataHandlingException;
import com.github.dedis.popstellar.utility.security.KeyManager;
import com.google.gson.Gson;
import io.reactivex.Completable;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

@RunWith(MockitoJUnitRunner.class)
public class LaoHandlerTest {

  private static final KeyPair SENDER_KEY = generateKeyPair();
  private static final PublicKey SENDER = SENDER_KEY.getPublicKey();

  private static final CreateLao CREATE_LAO = new CreateLao("lao", SENDER);
  private static final Channel LAO_CHANNEL = Channel.getLaoChannel(CREATE_LAO.getId());

  private static final Gson GSON = JsonModule.provideGson(DataRegistryModule.provideDataRegistry());

  private LAORepository laoRepository;
  private MessageHandler messageHandler;
  private ServerRepository serverRepository;

  public static final String RANDOM_KEY = "oOcKZjUeandJOFVgn-E6e-7QksviBBbHUPicdzUgIm8";
  public static final String RANDOM_ADDRESS = "ws://10.0.2.2:9000/organizer/client";
  public static final PeerAddress RANDOM_PEER = new PeerAddress("ws://128.0.0.2");

  private Lao lao;
  private MessageGeneral createLaoMessage;

  @Mock MessageSender messageSender;
  @Mock KeyManager keyManager;

  @Before
  public void setup() throws GeneralSecurityException, IOException {
    lenient().when(keyManager.getMainKeyPair()).thenReturn(SENDER_KEY);
    lenient().when(keyManager.getMainPublicKey()).thenReturn(SENDER);

    when(messageSender.subscribe(any())).then(args -> Completable.complete());

    laoRepository = new LAORepository();
    serverRepository = new ServerRepository();
    messageHandler =
        new MessageHandler(DataRegistryModule.provideDataRegistry(), keyManager, serverRepository);

    // Create one LAO and add it to the LAORepository
    lao = new Lao(CREATE_LAO.getName(), CREATE_LAO.getOrganizer(), CREATE_LAO.getCreation());
    lao.setLastModified(lao.getCreation());
    laoRepository.getLaoById().put(lao.getId(), new LAOState(lao));
    laoRepository.setAllLaoSubject();

    // Add the CreateLao message to the LAORepository
    createLaoMessage = new MessageGeneral(SENDER_KEY, CREATE_LAO, GSON);
    laoRepository.getMessageById().put(createLaoMessage.getMessageId(), createLaoMessage);
  }

  @Test
  public void testHandleUpdateLao() throws DataHandlingException {
    // Create the update LAO message
    UpdateLao updateLao =
        new UpdateLao(
            SENDER,
            CREATE_LAO.getCreation(),
            "new name",
            Instant.now().getEpochSecond(),
            new HashSet<>());
    MessageGeneral message = new MessageGeneral(SENDER_KEY, updateLao, GSON);

    // Create the expected WitnessMessage
    WitnessMessage expectedMessage =
        updateLaoNameWitnessMessage(message.getMessageId(), updateLao, lao);

    // Call the message handler
    messageHandler.handleMessage(laoRepository, messageSender, LAO_CHANNEL, message);

    // Check the WitnessMessage has been created
    Optional<WitnessMessage> witnessMessage =
        laoRepository.getLaoByChannel(LAO_CHANNEL).getWitnessMessage(message.getMessageId());
    assertTrue(witnessMessage.isPresent());
    assertEquals(expectedMessage.getTitle(), witnessMessage.get().getTitle());
    assertEquals(expectedMessage.getDescription(), witnessMessage.get().getDescription());
  }

  @Test
  public void testHandleStateLao() throws DataHandlingException {
    // Create the state LAO message
    StateLao stateLao =
        new StateLao(
            CREATE_LAO.getId(),
            CREATE_LAO.getName(),
            CREATE_LAO.getCreation(),
            Instant.now().getEpochSecond(),
            CREATE_LAO.getOrganizer(),
            createLaoMessage.getMessageId(),
            new HashSet<>(),
            new ArrayList<>());
    MessageGeneral message = new MessageGeneral(SENDER_KEY, stateLao, GSON);

    // Call the message handler
    messageHandler.handleMessage(laoRepository, messageSender, LAO_CHANNEL, message);

    // Check the LAO last modification time and ID was updated
    assertEquals(
        (Long) stateLao.getLastModified(),
        laoRepository.getLaoByChannel(LAO_CHANNEL).getLastModified());
    assertEquals(
        stateLao.getModificationId(),
        laoRepository.getLaoByChannel(LAO_CHANNEL).getModificationId());
  }

  @Test()
  public void testGreetLao() throws DataHandlingException {
    // Create the Greet Lao
    GreetLao greetLao =
        new GreetLao(lao.getId(), RANDOM_KEY, RANDOM_ADDRESS, Arrays.asList(RANDOM_PEER));

    MessageGeneral message = new MessageGeneral(SENDER_KEY, greetLao, GSON);

    // Call the handler
    messageHandler.handleMessage(laoRepository, messageSender, LAO_CHANNEL, message);

    // Check that the server repository contains the key of the server
    assertEquals(RANDOM_ADDRESS, serverRepository.getServerByLaoId(lao.getId()).getServerAddress());
    // Check that it contains the key as well
    assertEquals(RANDOM_KEY, serverRepository.getServerByLaoId(lao.getId()).getPublicKey());

    // Test for invalid LAO Id
    GreetLao greetLao_invalid =
        new GreetLao("123", RANDOM_KEY, RANDOM_ADDRESS, Arrays.asList(RANDOM_PEER));
    MessageGeneral message_invalid = new MessageGeneral(SENDER_KEY, greetLao_invalid, GSON);
    assertThrows(
        IllegalArgumentException.class,
        () ->
            messageHandler.handleMessage(
                laoRepository, messageSender, LAO_CHANNEL, message_invalid));
  }
}

