package com.github.dedis.popstellar.ui.home;

import android.Manifest;
import android.app.Application;
import android.content.pm.PackageManager;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.LiveDataReactiveStreams;
import androidx.lifecycle.MutableLiveData;

import com.github.dedis.popstellar.R;
import com.github.dedis.popstellar.SingleEvent;
import com.github.dedis.popstellar.model.network.answer.Error;
import com.github.dedis.popstellar.model.network.answer.Result;
import com.github.dedis.popstellar.model.network.method.message.MessageGeneral;
import com.github.dedis.popstellar.model.network.method.message.data.lao.CreateLao;
import com.github.dedis.popstellar.model.objects.Lao;
import com.github.dedis.popstellar.model.objects.Wallet;
import com.github.dedis.popstellar.model.qrcode.ConnectToLao;
import com.github.dedis.popstellar.repository.LAORepository;
import com.github.dedis.popstellar.repository.LAOState;
import com.github.dedis.popstellar.repository.remote.LAORequestFactory;
import com.github.dedis.popstellar.ui.qrcode.CameraPermissionViewModel;
import com.github.dedis.popstellar.ui.qrcode.QRCodeScanningViewModel;
import com.github.dedis.popstellar.ui.qrcode.ScanningAction;
import com.github.dedis.popstellar.utility.error.keys.SeedValidationException;
import com.github.dedis.popstellar.utility.security.KeyManager;
import com.google.android.gms.vision.barcode.Barcode;
import com.google.gson.Gson;
import com.google.gson.JsonParseException;

import java.security.GeneralSecurityException;
import java.util.List;
import java.util.concurrent.TimeUnit;

import javax.inject.Inject;

import dagger.hilt.android.lifecycle.HiltViewModel;
import io.reactivex.BackpressureStrategy;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;

@HiltViewModel
public class HomeViewModel extends AndroidViewModel
    implements CameraPermissionViewModel, QRCodeScanningViewModel {

  public static final String TAG = HomeViewModel.class.getSimpleName();
  public static final String SCAN = "SCAN";
  public static final String REQUEST_CAMERA_PERMISSION = "REQUEST_CAMERA_PERMISSION";
  private static final ScanningAction scanningAction = ScanningAction.ADD_LAO_PARTICIPANT;

  /*
   * LiveData objects for capturing events like button clicks
   */
  private final MutableLiveData<SingleEvent<String>> mOpenLaoEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mOpenHomeEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mOpenConnectingEvent =
      new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<String>> mOpenConnectEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mOpenLaunchEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mLaunchNewLaoEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mCancelNewLaoEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mCancelConnectEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mOpenWalletEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mOpenSeedEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<String>> mOpenLaoWalletEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mOpenSettingsEvent = new MutableLiveData<>();
  private final MutableLiveData<SingleEvent<Boolean>> mOpenSocialMediaEvent =
      new MutableLiveData<>();

  /*
   * LiveData objects that represent the state in a fragment
   */
  private final MutableLiveData<String> mConnectingLao = new MutableLiveData<>();
  private final MutableLiveData<Boolean> mIsWalletSetUp = new MutableLiveData<>(false);
  private final MutableLiveData<String> mLaoName = new MutableLiveData<>();
  private final LiveData<List<Lao>> mLAOs;

  /*
   * Dependencies for this class
   */
  private final Gson mGson;
  private final LAORepository mLAORepository;
  private final KeyManager mKeyManager;
  private final Wallet wallet;
  private final LAORequestFactory mRequestFactory;

  private final CompositeDisposable disposables = new CompositeDisposable();

  @Inject
  public HomeViewModel(
      @NonNull Application application,
      Gson gson,
      Wallet wallet,
      LAORepository laoRepository,
      KeyManager keyManager,
      LAORequestFactory requestFactory) {
    super(application);

    mLAORepository = laoRepository;
    mGson = gson;
    mKeyManager = keyManager;
    this.wallet = wallet;
    mRequestFactory = requestFactory;

    mLAOs =
        LiveDataReactiveStreams.fromPublisher(
            mLAORepository.getAllLaos().toFlowable(BackpressureStrategy.BUFFER));
  }

  @Override
  public void onPermissionGranted() {
    openQrCodeScanning();
  }

  @Override
  public int getScanDescription() {
    return R.string.qrcode_scanning_connect_lao;
  }

  @Override
  public ScanningAction getScanningAction() {
    return scanningAction;
  }

  @Override
  public void onQRCodeDetected(Barcode barcode) {
    Log.d(TAG, "Detected barcode with value: " + barcode.rawValue);
    ConnectToLao data;
    try {
      data = ConnectToLao.extractFrom(mGson, barcode.rawValue);
    } catch (JsonParseException e) {
      Log.e(TAG, "Invalid QRCode data", e);
      Toast.makeText(
              getApplication().getApplicationContext(), "Invalid QRCode data", Toast.LENGTH_LONG)
          .show();
      return;
    }

    mRequestFactory.setUrl(data.server);
    String channel = "/root/" + data.lao;
    disposables.add(
        mLAORepository
            .sendSubscribe(channel)
            .ignoreElement()
            .doOnComplete(
                () -> {
                  if (mLAORepository.isLaoChannel(channel)) {
                    Log.d(TAG, "subscribing to LAO with id " + channel);

                    // Create the new LAO and add it to the LAORepository LAO lists
                    Lao lao = new Lao(channel.replace("/root/", ""));
                    mLAORepository.getLaoById().put(channel, new LAOState(lao));
                    mLAORepository.setAllLaoSubject();
                  }
                })
            .subscribe(
                () -> {
                  Log.d(TAG, "got success result for subscribe to lao");
                  openHome();
                },
                throwable -> {
                  Log.d(TAG, "timed out waiting for a response for subscribe to lao", throwable);
                  openHome(); // so that it doesn't load forever
                }));
    setConnectingLao(channel);
    openConnecting();
  }

  /** onCleared is used to cancel all subscriptions to observables. */
  @Override
  protected void onCleared() {
    super.onCleared();

    disposables.dispose();
  }

  /**
   * launchLao is invoked when the user tries to create a new LAO. The method creates a `CreateLAO`
   * message and publishes it to the root channel. It observers the response in the background and
   * switches to the home screen on success.
   */
  public void launchLao() {
    String laoName = mLaoName.getValue();

    Log.d(TAG, "creating lao with name " + laoName);
    CreateLao createLao = new CreateLao(laoName, mKeyManager.getMainPublicKey());
    MessageGeneral msg = new MessageGeneral(mKeyManager.getMainKeyPair(), createLao, mGson);

    disposables.add(
        mLAORepository
            .sendPublish("/root", msg)
            .observeOn(AndroidSchedulers.mainThread())
            .timeout(5, TimeUnit.SECONDS)
            .subscribe(
                answer -> {
                  if (answer instanceof Result) {
                    Log.d(TAG, "got success result for create lao");
                    openHome();
                  } else {
                    Log.d(
                        TAG,
                        "got failure result for create lao: "
                            + ((Error) answer).getError().getDescription());
                  }
                },
                throwable ->
                    Log.d(TAG, "timed out waiting for a response for create lao", throwable)));
  }

  public void importSeed(String seed) throws GeneralSecurityException, SeedValidationException {
    wallet.importSeed(seed);
    setIsWalletSetUp(true);
    openWallet();
  }

  public void newSeed() {
    wallet.newSeed();
    mOpenSeedEvent.postValue(new SingleEvent<>(true));
  }

  /*
   * Getters for MutableLiveData instances declared above
   */
  public LiveData<List<Lao>> getLAOs() {
    return mLAOs;
  }

  public LiveData<SingleEvent<String>> getOpenLaoEvent() {
    return mOpenLaoEvent;
  }

  public LiveData<SingleEvent<Boolean>> getOpenHomeEvent() {
    return mOpenHomeEvent;
  }

  public LiveData<SingleEvent<Boolean>> getOpenConnectingEvent() {
    return mOpenConnectingEvent;
  }

  public LiveData<SingleEvent<String>> getOpenConnectEvent() {
    return mOpenConnectEvent;
  }

  public LiveData<SingleEvent<Boolean>> getOpenLaunchEvent() {
    return mOpenLaunchEvent;
  }

  public LiveData<SingleEvent<Boolean>> getLaunchNewLaoEvent() {
    return mLaunchNewLaoEvent;
  }

  public LiveData<SingleEvent<Boolean>> getCancelNewLaoEvent() {
    return mCancelNewLaoEvent;
  }

  public LiveData<SingleEvent<Boolean>> getCancelConnectEvent() {
    return mCancelConnectEvent;
  }

  public LiveData<String> getConnectingLao() {
    return mConnectingLao;
  }

  public LiveData<String> getLaoName() {
    return mLaoName;
  }

  public Boolean isWalletSetUp() {
    return mIsWalletSetUp.getValue();
  }

  public LiveData<SingleEvent<Boolean>> getOpenWalletEvent() {
    return mOpenWalletEvent;
  }

  public LiveData<SingleEvent<Boolean>> getOpenSeedEvent() {
    return mOpenSeedEvent;
  }

  public LiveData<SingleEvent<String>> getOpenLaoWalletEvent() {
    return mOpenLaoWalletEvent;
  }

  public LiveData<SingleEvent<Boolean>> getOpenSettingsEvent() {
    return mOpenSettingsEvent;
  }

  public LiveData<SingleEvent<Boolean>> getOpenSocialMediaEvent() {
    return mOpenSocialMediaEvent;
  }

  /*
   * Methods that modify the state or post an Event to update the UI.
   */

  public void openLAO(String laoId) {
    mOpenLaoEvent.setValue(new SingleEvent<>(laoId));
  }

  public void openHome() {
    mOpenHomeEvent.postValue(new SingleEvent<>(true));
  }

  public void openConnecting() {
    mOpenConnectingEvent.postValue(new SingleEvent<>(true));
  }

  public void openWallet() {
    mOpenWalletEvent.postValue(new SingleEvent<>(isWalletSetUp()));
  }

  public void openLaoWallet(String laoId) {
    mOpenLaoWalletEvent.postValue(new SingleEvent<>(laoId));
  }

  public void openConnect() {
    if (ActivityCompat.checkSelfPermission(
            getApplication().getApplicationContext(), Manifest.permission.CAMERA)
        == PackageManager.PERMISSION_GRANTED) {
      openQrCodeScanning();
    } else {
      openCameraPermission();
    }
  }

  public void openQrCodeScanning() {
    mOpenConnectEvent.setValue(new SingleEvent<>(SCAN));
  }

  public void openCameraPermission() {
    mOpenConnectEvent.setValue(new SingleEvent<>(REQUEST_CAMERA_PERMISSION));
  }

  public void openLaunch() {
    mOpenLaunchEvent.setValue(new SingleEvent<>(true));
  }

  public void openSettings() {
    mOpenSettingsEvent.setValue(new SingleEvent<>(true));
  }

  public void openSocialMedia() {
    mOpenSocialMediaEvent.setValue(new SingleEvent<>(true));
  }

  public void launchNewLao() {
    mLaunchNewLaoEvent.setValue(new SingleEvent<>(true));
  }

  public void cancelNewLao() {
    mCancelNewLaoEvent.setValue(new SingleEvent<>(true));
  }

  public void cancelConnect() {
    mCancelConnectEvent.setValue(new SingleEvent<>(true));
  }

  public void setConnectingLao(String lao) {
    this.mConnectingLao.postValue(lao);
  }

  public void setLaoName(String name) {
    this.mLaoName.setValue(name);
  }

  public void setIsWalletSetUp(Boolean isSetUp) {
    this.mIsWalletSetUp.setValue(isSetUp);
  }

  public void logoutWallet() {
    wallet.logout();
    setIsWalletSetUp(false);
    openWallet();
  }
}
