package com.github.dedis.student20_pop.detail.adapters;

import android.app.AlertDialog;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;

import androidx.databinding.DataBindingUtil;
import androidx.lifecycle.LifecycleOwner;

import com.github.dedis.student20_pop.R;
import com.github.dedis.student20_pop.databinding.LayoutWitnessMessageBinding;
import com.github.dedis.student20_pop.detail.LaoDetailViewModel;
import com.github.dedis.student20_pop.model.WitnessMessage;

import java.util.List;

/** Adapter to show the messages that have to be signed by the witnesses  */
public class WitnessMessageListViewAdapter extends BaseAdapter {

    private final LaoDetailViewModel viewModel;

    private List<WitnessMessage> messages;

    private LifecycleOwner lifecycleOwner;

    public WitnessMessageListViewAdapter(
            List<WitnessMessage> messages, LaoDetailViewModel viewModel, LifecycleOwner activity) {
        this.viewModel = viewModel;
        setList(messages);
        lifecycleOwner = activity;
    }

    public void replaceList(List<WitnessMessage> messages) {
        setList(messages);
    }

    private void setList(List<WitnessMessage> messages) {
        this.messages = messages;
        notifyDataSetChanged();
    }

    /**
     * How many items are in the data set represented by this Adapter.
     *
     * @return Count of items.
     */
    @Override
    public int getCount() {
        return messages != null ? messages.size() : 0;
    }


    @Override
    public Object getItem(int position) {
        return messages.get(position);
    }

    @Override
    public long getItemId(int position) {
        return  position;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        LayoutWitnessMessageBinding binding;
        if (convertView == null) {
            // inflate
            LayoutInflater inflater = LayoutInflater.from(parent.getContext());

            binding = LayoutWitnessMessageBinding.inflate(inflater, parent, false);
        } else {
            binding = DataBindingUtil.getBinding(convertView);
        }
        Context context = parent.getContext();
        View.OnClickListener listener = v -> {
            AlertDialog.Builder adb = new AlertDialog.Builder(context);
            adb.setTitle("Sign Message");
            adb.setMessage(" Are you sure you want to sign message with ID" + messages.get(position).getMessageId());
            adb.setNegativeButton("Cancel", null);
            adb.setPositiveButton(
                    "Confirm",
                    (dialog, which) -> {
                        viewModel.signMessage(messages.get(position));
                    });
            adb.show();

        };
        binding.signMessageButton.setOnClickListener(listener);

        binding.setMessage(messages.get(position));
        binding.setLifecycleOwner(lifecycleOwner);

        binding.executePendingBindings();

        return binding.getRoot();



    }
}
