package com.github.dedis.popstellar.ui.detail.event.rollcall;

import android.graphics.Bitmap;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.appcompat.content.res.AppCompatResources;
import androidx.core.widget.ImageViewCompat;
import androidx.fragment.app.Fragment;

import com.github.dedis.popstellar.R;
import com.github.dedis.popstellar.model.objects.RollCall;
import com.github.dedis.popstellar.model.objects.event.EventState;
import com.github.dedis.popstellar.model.objects.security.PublicKey;
import com.github.dedis.popstellar.ui.detail.LaoDetailActivity;
import com.github.dedis.popstellar.ui.detail.LaoDetailViewModel;

import net.glxn.qrgen.android.QRCode;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import dagger.hilt.android.AndroidEntryPoint;

@AndroidEntryPoint
public class RollCallFragment extends Fragment {
  public static final String TAG = RollCallFragment.class.getSimpleName();
  private final SimpleDateFormat DATE_FORMAT =
      new SimpleDateFormat("dd/MM/yyyy HH:mm z", Locale.ENGLISH);
  private LaoDetailViewModel laoDetailViewModel;
  private RollCall rollCall;
  private Button managementButton;
  private TextView title;
  private TextView statusText;
  private ImageView statusIcon;
  private PublicKey pk;

  public RollCallFragment() {
    // Required empty public constructor
  }

  public RollCallFragment(PublicKey pk) {
    this.pk = pk;
  }

  public static RollCallFragment newInstance(PublicKey pk) {
    return new RollCallFragment(pk);
  }

  public static RollCallFragment newInstance(RollCall rollCall) {
    return new RollCallFragment(rollCall);
  }

  public RollCallFragment(RollCall rollCall) {
    this.rollCall = rollCall;
  }

  @Override
  public View onCreateView(
      LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
    // Inflate the layout for this fragment
    View view = inflater.inflate(R.layout.roll_call_fragment, container, false);

    laoDetailViewModel = LaoDetailActivity.obtainViewModel(requireActivity());
    if (rollCall == null) {
      rollCall = laoDetailViewModel.getCurrentRollCall();
    }
    managementButton = view.findViewById(R.id.roll_call_management_button);
    title = view.findViewById(R.id.roll_call_fragment_title);
    statusText = view.findViewById(R.id.roll_call_fragment_status);
    statusIcon = view.findViewById(R.id.roll_call_fragment_status_icon);

    setUpStateDependantContent();
    setupTime(view);

    View.OnClickListener listener =
        v -> {
          EventState state = rollCall.getState().getValue();
          switch (state) {
            case CLOSED:
            case CREATED:
              laoDetailViewModel.openRollCall(rollCall.getId());
              break;
            case OPENED:
              // will add the scan to this fragment in the future
              laoDetailViewModel.closeRollCall();
              break;
            case RESULTS_READY:
              throw new IllegalStateException("Roll-Call should not be in a Result Ready state");
          }
        };

    managementButton.setOnClickListener(listener);

    rollCall
        .getState()
        .observe(getViewLifecycleOwner(), eventState -> setUpStateDependantContent());

    ImageView qrCode = view.findViewById(R.id.roll_call_pk_qr_code);
    if (pk != null) {
      Log.d(TAG, "key displayed is " + pk.getEncoded());
      Bitmap myBitmap = QRCode.from(pk.getEncoded()).bitmap();
      qrCode.setImageBitmap(myBitmap);
    }
    qrCode.setVisibility(
        laoDetailViewModel.isOrganizer().getValue() ? View.INVISIBLE : View.VISIBLE);

    return view;
  }

  private void setUpStateDependantContent() {
    EventState rcState = rollCall.getState().getValue();
    boolean isOrganizer = laoDetailViewModel.isOrganizer().getValue();

    title.setText(rollCall.getName());
    managementButton.setVisibility(isOrganizer ? View.VISIBLE : View.GONE);

    Drawable imgStatus = null;
    Drawable imgManagement = null;

    int managementTextId = 0;
    int statusTextId = 0;

    switch (rcState) {
      case CREATED:
        managementTextId = R.string.open;
        statusTextId = R.string.closed;

        imgStatus = getDrawableFromContext(R.drawable.ic_lock);
        setImageColor(statusIcon, R.color.red);
        statusText.setTextColor(getResources().getColor(R.color.red, null));

        imgManagement = AppCompatResources.getDrawable(getContext(), R.drawable.ic_unlock);
        break;
      case OPENED:
        statusTextId = R.string.open;
        managementTextId = R.string.close;

        imgStatus = getDrawableFromContext(R.drawable.ic_unlock);
        setImageColor(statusIcon, R.color.green);
        statusText.setTextColor(getResources().getColor(R.color.green, null));

        imgManagement = AppCompatResources.getDrawable(getContext(), R.drawable.ic_lock);
        break;
      case CLOSED:
        statusTextId = R.string.closed;
        managementTextId = R.string.reopen_rollcall;

        imgStatus = getDrawableFromContext(R.drawable.ic_lock);
        setImageColor(statusIcon, R.color.red);
        statusText.setTextColor(getResources().getColor(R.color.red, null));

        imgManagement = AppCompatResources.getDrawable(getContext(), R.drawable.ic_unlock);
        break;
      case RESULTS_READY:
        // Should never happened for a Roll-Call
        throw new IllegalStateException("Roll-Call should not be in a Result Ready state");
    }

    managementButton.setText(managementTextId);
    managementButton.setCompoundDrawables(imgManagement, null, null, null);

    statusIcon.setImageDrawable(imgStatus);
    statusText.setText(statusTextId);
  }

  private void setupTime(View view) {
    TextView startTimeDisplay = view.findViewById(R.id.roll_call_fragment_start_time);
    TextView endTimeDisplay = view.findViewById(R.id.roll_call_fragment_end_time);

    Date startTime = new Date(rollCall.getStartTimestampInMillis());
    Date endTime = new Date(rollCall.getEndTimestampInMillis());

    startTimeDisplay.setText(DATE_FORMAT.format(startTime));
    endTimeDisplay.setText(DATE_FORMAT.format(endTime));
  }

  private Drawable getDrawableFromContext(int id) {
    return AppCompatResources.getDrawable(getContext(), id);
  }

  private void setImageColor(ImageView imageView, int colorId) {
    ImageViewCompat.setImageTintList(imageView, getResources().getColorStateList(colorId, null));
  }
}
