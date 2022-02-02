package com.github.dedis.popstellar.ui.socialmedia;

import static android.text.format.DateUtils.getRelativeTimeSpanString;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ImageButton;
import android.widget.TextView;

import com.github.dedis.popstellar.R;
import com.github.dedis.popstellar.model.objects.Chirp;
import com.github.dedis.popstellar.model.objects.security.PublicKey;

import java.util.List;

public class ChirpListAdapter extends BaseAdapter {

  private final SocialMediaViewModel socialMediaViewModel;
  private List<Chirp> chirps;
  private final LayoutInflater layoutInflater;

  public ChirpListAdapter(
      Context context, SocialMediaViewModel socialMediaViewModel, List<Chirp> chirps) {
    this.socialMediaViewModel = socialMediaViewModel;
    this.chirps = chirps;
    layoutInflater = LayoutInflater.from(context);
  }

  public void replaceList(List<Chirp> chirps) {
    this.chirps = chirps;
    notifyDataSetChanged();
  }

  @Override
  public int getCount() {
    return chirps != null ? chirps.size() : 0;
  }

  @Override
  public Chirp getItem(int position) {
    return chirps.get(position);
  }

  @Override
  public long getItemId(int position) {
    return position;
  }

  @Override
  public View getView(int position, View chirpView, ViewGroup viewGroup) {
    if (chirpView == null) {
      chirpView = layoutInflater.inflate(R.layout.chirp_card, null);
    }

    Chirp chirp = getItem(position);
    if (chirp == null) {
      throw new IllegalArgumentException("The chirp does not exist");
    }
    PublicKey publicKey = chirp.getSender();
    long timestamp = chirp.getTimestamp();
    String text;

    TextView itemUsername = chirpView.findViewById(R.id.social_media_username);
    TextView itemTime = chirpView.findViewById(R.id.social_media_time);
    TextView itemText = chirpView.findViewById(R.id.social_media_text);

    if (socialMediaViewModel.isOwner(publicKey.getEncoded())) {
      ImageButton deleteChirp = chirpView.findViewById(R.id.delete_chirp_button);
      deleteChirp.setVisibility(View.VISIBLE);
      deleteChirp.setOnClickListener(v -> socialMediaViewModel.deleteChirpEvent(chirp.getId()));
    }

    if (chirp.getIsDeleted()) {
      text = "Chirp is deleted.";
      ImageButton deleteChirp = chirpView.findViewById(R.id.delete_chirp_button);
      deleteChirp.setVisibility(View.GONE);
      itemText.setTextColor(Color.GRAY);
    } else {
      text = chirp.getText();
    }

    itemUsername.setText(publicKey.getEncoded());
    itemTime.setText(getRelativeTimeSpanString(timestamp * 1000));
    itemText.setText(text);

    return chirpView;
  }
}
