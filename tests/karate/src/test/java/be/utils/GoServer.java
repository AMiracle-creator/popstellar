package be.utils;

import java.nio.file.Paths;

public class GoServer extends Server implements Configurable {

  @Override
  public boolean start() {
    return super.start(getCmd(), getDir(), getLogPath());
  }

  @Override
  public void stop() {
    super.stop();
  }

  @Override
  public String[] getCmd() {
    if (isWindowsOS()) {
      return new String[]{
        "cmd",
        "/c",
        "\"pop.exe server serve\""
      };
    } else {
      return new String[]{
        "bash",
        "-c",
        "./pop server serve"
      };
    }
  }

  @Override
  public String getDir() {
    return Paths.get("..", "..", "be1-go").toString();
  }

  @Override
  public String getLogPath() {
    return Paths.get("go.log").toString();
  }

  @Override
  public void deleteDatabaseDir() {
    //TODO: delete GO backend database if necessary
    System.out.println("No database to delete for GO backend");

  }
}
