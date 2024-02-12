package ch.epfl.pop.config

import ch.epfl.pop.config.RuntimeEnvironment.readServerPeers
import ch.epfl.pop.config.RuntimeEnvironmentTestingHelper.testWriteToServerPeersConfig
import org.scalatest.funsuite.{AnyFunSuiteLike => FunSuite}
import org.scalatest.matchers.should.Matchers._

class RuntimeEnvironmentSuite extends FunSuite {
  test("readServerPeers() should only return the addresses that match the regex from the schema") {

    // Values to add in the file
    val addressList = List(
      "http://127.0.0.1/",
      "ws://127.0.0.1:7000/client",
      "wss://127.0.0.1:8000/client",
      "ws://127.0.0.1:9000/client"
    )

    testWriteToServerPeersConfig(addressList)

    // Verify it works as expected
    readServerPeers() should equal(addressList.tail)
  }
}
