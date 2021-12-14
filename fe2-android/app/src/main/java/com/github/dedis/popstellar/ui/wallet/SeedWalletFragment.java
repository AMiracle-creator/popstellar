package com.github.dedis.popstellar.ui.wallet;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;

import com.github.dedis.popstellar.databinding.WalletSeedFragmentBinding;
import com.github.dedis.popstellar.model.objects.Wallet;
import com.github.dedis.popstellar.ui.home.HomeActivity;
import com.github.dedis.popstellar.ui.home.HomeViewModel;

import java.util.StringJoiner;

import dagger.hilt.android.AndroidEntryPoint;

/** Fragment used to display the new seed UI */
@AndroidEntryPoint
public class SeedWalletFragment extends Fragment {

  public static final String TAG = SeedWalletFragment.class.getSimpleName();
  private WalletSeedFragmentBinding mWalletSeedFragBinding;
  private HomeViewModel mHomeViewModel;
  private Wallet wallet;

  public static SeedWalletFragment newInstance() {
    return new SeedWalletFragment();
  }

  private AlertDialog seedAlert;

  @Nullable
  @Override
  public View onCreateView(
      @NonNull LayoutInflater inflater,
      @Nullable ViewGroup container,
      @Nullable Bundle savedInstanceState) {
    wallet = Wallet.getInstance();

    mWalletSeedFragBinding = WalletSeedFragmentBinding.inflate(inflater, container, false);

    FragmentActivity activity = getActivity();
    if (activity instanceof HomeActivity) {
      mHomeViewModel = HomeActivity.obtainViewModel(activity);
    } else {
      throw new IllegalArgumentException("Cannot obtain view model for " + TAG);
    }

    mWalletSeedFragBinding.setViewModel(mHomeViewModel);
    mWalletSeedFragBinding.setLifecycleOwner(activity);

    return mWalletSeedFragBinding.getRoot();
  }

  @Override
  public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);
    setupDisplaySeed();
    setupConfirmSeedButton();

    mWalletSeedFragBinding.seedWallet.setOnClickListener(
        v -> {
          ClipboardManager clipboardManager =
              (ClipboardManager)
                  requireContext()
                      .getApplicationContext()
                      .getSystemService(Context.CLIPBOARD_SERVICE);
          clipboardManager.setPrimaryClip(
              ClipData.newPlainText("Seed", mWalletSeedFragBinding.seedWallet.getText()));
          Toast.makeText(
                  requireContext().getApplicationContext(),
                  "Copied to clipboard",
                  Toast.LENGTH_LONG)
              .show();
        });
  }

  private void setupDisplaySeed() {
    String[] exportSeed = new String[0];
    String err = "Error import key, try again";
    try {
      exportSeed = wallet.exportSeed();
    } catch (Exception e) {
      Toast.makeText(requireContext().getApplicationContext(), err, Toast.LENGTH_LONG).show();
      Log.d(TAG, "Error while importing key", e);
    }
    if (exportSeed != null && exportSeed.length > 0) {
      StringJoiner joiner = new StringJoiner(" ");
      for (String i : exportSeed) {
        joiner.add(i);
      }
      mWalletSeedFragBinding.seedWallet.setText(joiner.toString());
    } else {
      Toast.makeText(requireContext().getApplicationContext(), err, Toast.LENGTH_LONG).show();
    }
  }

  private void setupConfirmSeedButton() {
    mWalletSeedFragBinding.buttonConfirmSeed.setOnClickListener(
        v -> {
          if (seedAlert != null && seedAlert.isShowing()) {
            seedAlert.dismiss();
          }
          AlertDialog.Builder builder = new AlertDialog.Builder(requireActivity());
          builder.setTitle("You are sure you have saved the words somewhere?");
          builder.setPositiveButton(
              "Yes",
              (dialog, which) -> {
                if (!mHomeViewModel.importSeed(
                    mWalletSeedFragBinding.seedWallet.getText().toString())) {
                  Toast.makeText(
                          requireContext().getApplicationContext(),
                          "Error import key, try again",
                          Toast.LENGTH_LONG)
                      .show();
                }
              });
          builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
          seedAlert = builder.create();
          seedAlert.show();
        });
  }
}
