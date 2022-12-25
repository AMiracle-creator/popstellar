package com.github.dedis.popstellar.ui.digitalcash;

import android.os.Bundle;
import android.util.Log;
import android.view.*;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.github.dedis.popstellar.R;
import com.github.dedis.popstellar.databinding.DigitalCashHomeFragmentBinding;
import com.github.dedis.popstellar.model.objects.digitalcash.TransactionObject;
import com.github.dedis.popstellar.model.objects.security.PoPToken;
import com.github.dedis.popstellar.model.objects.security.PublicKey;
import com.github.dedis.popstellar.utility.error.ErrorUtils;

import static com.github.dedis.popstellar.ui.digitalcash.DigitalCashActivity.TAG;

/**
 * A simple {@link Fragment} subclass. Use the {@link DigitalCashHomeFragment#newInstance} factory
 * method to create an instance of this fragment.
 */
public class DigitalCashHomeFragment extends Fragment {
  private DigitalCashHomeFragmentBinding binding;
  private DigitalCashViewModel viewModel;

  public DigitalCashHomeFragment() {
    // Required empty constructor
  }
  /**
   * Use this factory method to create a new instance of this fragment
   *
   * @return A new instance of fragment DigitalCashHomeFragment.
   */
  public static DigitalCashHomeFragment newInstance() {
    return new DigitalCashHomeFragment();
  }

  @Override
  public View onCreateView(
      @NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
    viewModel = DigitalCashActivity.obtainViewModel(getActivity());
    binding = DigitalCashHomeFragmentBinding.inflate(inflater, container, false);
    return binding.getRoot();
  }

  @Override
  public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);
    setHomeInterface();
  }

  @Override
  public void onResume() {
    super.onResume();
    viewModel.setPageTitle(R.string.digital_cash_home);
  }

  public void setHomeInterface() {
    // Subscribe to roll calls so that our own address is kept updated in case a new rc is closed
    viewModel.addDisposable(
        viewModel
            .getRollCallsObservable()
            .subscribe(
                ids -> {
                  PoPToken token = viewModel.getValidToken();
                  PublicKey publicKey = token.getPublicKey();
                  binding.digitalCashHomeAddress.setText(publicKey.getEncoded());
                },
                error ->
                    ErrorUtils.logAndShow(
                        requireContext(), TAG, error, R.string.error_retrieve_own_token)));

    viewModel.addDisposable(
        viewModel
            .getTransactionsObservable()
            .subscribe(
                transactions -> {
                  if (transactions != null) {
                    Log.d(TAG, "transactions " + transactions);
                    long totalAmount =
                        TransactionObject.getMiniLaoPerReceiverSetTransaction(
                            transactions, viewModel.getValidToken().getPublicKey());
                    binding.digitalCashSendAddress.setText(
                        String.format("LAO coin : %s", totalAmount));
                  }
                },
                error ->
                    ErrorUtils.logAndShow(
                        requireContext(), TAG, error, R.string.error_retrieve_own_token)));
  }
}
