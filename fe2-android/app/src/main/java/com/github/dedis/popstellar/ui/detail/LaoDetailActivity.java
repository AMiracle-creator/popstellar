package com.github.dedis.popstellar.ui.detail;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;

import androidx.annotation.*;
import androidx.appcompat.app.*;
import androidx.fragment.app.*;
import androidx.lifecycle.ViewModelProvider;

import com.github.dedis.popstellar.R;
import com.github.dedis.popstellar.ui.detail.witness.WitnessingFragment;
import com.github.dedis.popstellar.ui.digitalcash.DigitalCashActivity;
import com.github.dedis.popstellar.ui.home.HomeActivity;
import com.github.dedis.popstellar.ui.socialmedia.SocialMediaActivity;
import com.github.dedis.popstellar.ui.wallet.LaoWalletFragment;
import com.github.dedis.popstellar.utility.ActivityUtils;
import com.github.dedis.popstellar.utility.Constants;
import com.google.android.material.bottomnavigation.BottomNavigationView;

import java.util.Objects;
import java.util.function.Supplier;

import dagger.hilt.android.AndroidEntryPoint;

@AndroidEntryPoint
public class LaoDetailActivity extends AppCompatActivity {

  private LaoDetailViewModel mViewModel;
  private BottomNavigationView navbar;

  public static LaoDetailViewModel obtainViewModel(FragmentActivity activity) {
    return new ViewModelProvider(activity).get(LaoDetailViewModel.class);
  }

  @Override
  protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.lao_detail_activity);
    mViewModel = obtainViewModel(this);

    navbar = findViewById(R.id.lao_detail_nav_bar);
    setupNavigationBar();

    setupBackButton();

    mViewModel.subscribeToLao(
        (String) Objects.requireNonNull(getIntent().getExtras()).get(Constants.LAO_ID_EXTRA));
    if (getIntent()
        .getExtras()
        .get(Constants.FRAGMENT_TO_OPEN_EXTRA)
        .equals(Constants.LAO_DETAIL_EXTRA)) {
      setCurrentFragment(
          getSupportFragmentManager(), R.id.fragment_lao_detail, LaoDetailFragment::newInstance);
    } else {
      setupLaoWalletFragment();
    }
  }

  @Override
  public boolean onOptionsItemSelected(@NonNull MenuItem menuItem) {
    if (menuItem.getItemId() == android.R.id.home) {
      Fragment fragment =
          getSupportFragmentManager().findFragmentById(R.id.fragment_container_lao_detail);
      if (fragment instanceof LaoDetailFragment) {
        startActivity(HomeActivity.newIntent(this));
      } else {
        navbar.setSelectedItemId(R.id.lao_detail_event_list_menu);
      }
      return true;
    }
    return super.onOptionsItemSelected(menuItem);
  }

  private void setupBackButton() {
    ActionBar actionBar = getSupportActionBar();
    if (actionBar != null) {
      actionBar.setHomeAsUpIndicator(R.drawable.ic_back_arrow);
      actionBar.setDisplayHomeAsUpEnabled(true);
    }
  }

  private void setupLaoWalletFragment() {
    setCurrentFragment(
        getSupportFragmentManager(), R.id.fragment_lao_wallet, LaoWalletFragment::newInstance);
  }

  public static void setUpWalletMessage(Context ctx) {
    AlertDialog.Builder builder = new AlertDialog.Builder(ctx);
    builder.setTitle("You have to setup up your wallet before connecting.");
    builder.setPositiveButton("Ok", (dialog, which) -> dialog.dismiss());
    builder.show();
  }

  public void setupNavigationBar() {
    navbar.setOnItemSelectedListener(
        item -> {
          int id = item.getItemId();
          if (id == R.id.lao_detail_event_list_menu) {
            setCurrentFragment(
                getSupportFragmentManager(),
                R.id.fragment_lao_detail,
                LaoDetailFragment::newInstance);
          } else if (id == R.id.lao_detail_identity_menu) {
            setCurrentFragment(
                getSupportFragmentManager(),
                R.id.fragment_identity,
                () -> IdentityFragment.newInstance(mViewModel.getPublicKey()));
          } else if (id == R.id.lao_detail_witnessing_menu) {
            setCurrentFragment(
                getSupportFragmentManager(),
                R.id.fragment_witnessing,
                WitnessingFragment::newInstance);
          } else if (id == R.id.lao_detail_digital_cash_menu) {
            startActivity(
                DigitalCashActivity.newIntent(
                    this,
                    mViewModel.getCurrentLaoValue().getId(),
                    mViewModel.getCurrentLaoValue().getName()));
          } else if (id == R.id.lao_detail_social_media_menu) {
            startActivity(
                SocialMediaActivity.newIntent(
                    this,
                    mViewModel.getCurrentLaoValue().getId(),
                    mViewModel.getCurrentLaoValue().getName()));
          }
          return true;
        });
  }

  /**
   * Set the current fragment in the container of the activity
   *
   * @param id of the fragment
   * @param fragmentSupplier provides the fragment if it is missing
   */
  public static void setCurrentFragment(
      FragmentManager manager, @IdRes int id, Supplier<Fragment> fragmentSupplier) {
    ActivityUtils.setFragmentInContainer(
        manager, R.id.fragment_container_lao_detail, id, fragmentSupplier);
  }

  public static Intent newIntentForLao(Context ctx, String laoId) {
    Intent intent = new Intent(ctx, LaoDetailActivity.class);
    intent.putExtra(Constants.LAO_ID_EXTRA, laoId);
    intent.putExtra(Constants.FRAGMENT_TO_OPEN_EXTRA, Constants.LAO_DETAIL_EXTRA);
    return intent;
  }

  public static Intent newIntentForWallet(Context ctx, String laoId) {
    Intent intent = new Intent(ctx, LaoDetailActivity.class);
    intent.putExtra(Constants.LAO_ID_EXTRA, laoId);
    intent.putExtra(Constants.FRAGMENT_TO_OPEN_EXTRA, Constants.CONTENT_WALLET_EXTRA);
    return intent;
  }
}
