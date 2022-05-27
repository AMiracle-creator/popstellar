package com.github.dedis.popstellar.model.network.method.message.data.digitalcash;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

import com.github.dedis.popstellar.model.objects.security.PublicKey;

import org.junit.Test;

public class Script_inputTest {
  private static final String TYPE = "P2PKH";
  private static final String PUBKEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  private static final String SIG = "CAFEBABE";

  private static final ScriptInput SCRIPTTXIN = new ScriptInput(TYPE, new PublicKey(PUBKEY), SIG);

  @Test
  public void testGetType() {
    assertEquals(TYPE, SCRIPTTXIN.getType());
  }

  @Test
  public void testGetSig() {
    assertEquals(SIG, SCRIPTTXIN.getSig());
  }

  @Test
  public void testGetPub_key_recipient() {
    assertEquals(PUBKEY, SCRIPTTXIN.getPubkey().getEncoded());
  }

  @Test
  public void testTestEquals() {
    assertEquals(SCRIPTTXIN, new ScriptInput(TYPE, new PublicKey(PUBKEY), SIG));
    String random = "BBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB=";
    assertNotEquals(SCRIPTTXIN, new ScriptInput(random, new PublicKey(PUBKEY), SIG));
    assertNotEquals(SCRIPTTXIN, new ScriptInput(TYPE, new PublicKey(random), SIG));
    assertNotEquals(SCRIPTTXIN, new ScriptInput(TYPE, new PublicKey(PUBKEY), random));
  }
}
