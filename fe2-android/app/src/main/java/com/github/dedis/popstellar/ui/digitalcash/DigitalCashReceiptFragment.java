package com.github.dedis.popstellar.ui.digitalcash;

import android.os.Bundle;
import android.view.*;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.github.dedis.popstellar.R;
import com.github.dedis.popstellar.databinding.DigitalCashReceiptFragmentBinding;
import com.github.dedis.popstellar.ui.lao.LaoActivity;
import com.github.dedis.popstellar.ui.lao.LaoViewModel;

/**
 * A simple {@link Fragment} subclass. Use the {@link DigitalCashReceiptFragment} factory method to
 * create an instance of this fragment.
 */
public class DigitalCashReceiptFragment extends Fragment {
  private DigitalCashReceiptFragmentBinding binding;
  private LaoViewModel viewModel;
  private DigitalCashViewModel digitalCashViewModel;

  /**
   * Use this factory method to create a new instance of this fragment using the provided
   * parameters.
   *
   * @return A new instance of fragment DigitalCashReceiveFragment.
   */
  public static DigitalCashReceiptFragment newInstance() {
    return new DigitalCashReceiptFragment();
  }

  @Override
  public View onCreateView(
      @NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
    viewModel = LaoActivity.obtainViewModel(requireActivity());
    digitalCashViewModel =
        LaoActivity.obtainDigitalCashViewModel(requireActivity(), viewModel.getLaoId());
    binding = DigitalCashReceiptFragmentBinding.inflate(inflater, container, false);
    return binding.getRoot();
  }

  @Override
  public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);
    digitalCashViewModel
        .getUpdateReceiptAmountEvent()
        .observe(
            getViewLifecycleOwner(),
            stringEvent -> {
              String amount = stringEvent.getContentIfNotHandled();
              if (amount != null) {
                binding.digitalCashReceiptAmount.setText(amount);
              }
            });
    digitalCashViewModel
        .getUpdateReceiptAddressEvent()
        .observe(
            getViewLifecycleOwner(),
            stringEvent -> {
              String address = stringEvent.getContentIfNotHandled();
              if (address != null) {
                binding.digitalCashReceiptBeneficiary.setText(
                    String.format("Beneficary : %n %s", address));
              }
            });
  }

  @Override
  public void onResume() {
    super.onResume();
    viewModel.setPageTitle(R.string.digital_cash_receipt);
    viewModel.setIsTab(false);
  }
}
