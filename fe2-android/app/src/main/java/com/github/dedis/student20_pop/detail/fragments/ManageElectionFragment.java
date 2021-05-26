package com.github.dedis.student20_pop.detail.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import com.github.dedis.student20_pop.R;
import com.github.dedis.student20_pop.databinding.FragmentManageElectionBinding;
import com.github.dedis.student20_pop.detail.LaoDetailActivity;
import com.github.dedis.student20_pop.detail.LaoDetailViewModel;
import com.github.dedis.student20_pop.home.HomeActivity;
import com.github.dedis.student20_pop.model.network.method.message.ElectionQuestion;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class  ManageElectionFragment extends Fragment {

    public static final String TAG = ManageElectionFragment.class.getSimpleName();

    private final SimpleDateFormat dateFormat =
      new SimpleDateFormat("dd/MM/yyyy HH:mm z", Locale.ENGLISH);
    private Button terminate;
    private LaoDetailViewModel laoDetailViewModel;


    public static ManageElectionFragment newInstance() {
        return new ManageElectionFragment();
    }

    @Nullable
    @Override
    public View onCreateView(
            @NonNull LayoutInflater inflater,
            @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {

        FragmentManageElectionBinding mManageElectionFragBinding;
        TextView laoName;
       TextView electionName;
         TextView currentTime;
         TextView startTime;
         TextView endTime;
         TextView question;
        mManageElectionFragBinding =
                FragmentManageElectionBinding.inflate(inflater, container, false);

        laoDetailViewModel = LaoDetailActivity.obtainViewModel(getActivity());
        terminate = mManageElectionFragBinding.terminateElection;
        currentTime = mManageElectionFragBinding.displayedCurrentTime;
        startTime = mManageElectionFragBinding.displayedStartTime;
        endTime = mManageElectionFragBinding.displayedEndTime;
        question = mManageElectionFragBinding.electionQuestion;
        laoName = mManageElectionFragBinding.manageElectionLaoName;
        electionName = mManageElectionFragBinding.manageElectionTitle;
        Date dCurrent = new java.util.Date(System.currentTimeMillis()); // Get's the date based on the unix time stamp
        Date dStart = new java.util.Date(laoDetailViewModel.getCurrentElection().getStartTimestamp() * 1000);// *1000 because it needs to be in milisecond
        Date dEnd = new java.util.Date(laoDetailViewModel.getCurrentElection().getEndTimestamp() * 1000);
        currentTime.setText(dateFormat.format(dCurrent)); // Set's the start time in the form dd/MM/yyyy HH:mm z
        startTime.setText(dateFormat.format(dStart));
        endTime.setText(dateFormat.format(dEnd));
        laoName.setText(laoDetailViewModel.getCurrentLaoName().getValue());
        electionName.setText(laoDetailViewModel.getCurrentElection().getName());

        List<ElectionQuestion> electionQuestions = laoDetailViewModel.getCurrentElection().getElectionQuestions();
        if (electionQuestions.isEmpty()) question.setText("No election question !");
        else question.setText("Election Question : " + electionQuestions.get(0).getQuestion());

        mManageElectionFragBinding.setLifecycleOwner(getActivity());
        return mManageElectionFragBinding.getRoot();

    }

    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        setupHomeButton();
        Button back = (Button) getActivity().findViewById(R.id.tab_back);
        back.setOnClickListener(c->laoDetailViewModel.openLaoDetail());
        //On click, terminate button  current Election
        terminate.setOnClickListener(
                v -> {
                   // TODO implement the cancel election action with backend when the backend is ready
                    laoDetailViewModel.terminateCurrentElection();
                    laoDetailViewModel.openLaoDetail();

                });

        // Subscribe to "open home" event
        laoDetailViewModel
                .getOpenHomeEvent()
                .observe(
                        this,
                        booleanEvent -> {
                            Boolean event = booleanEvent.getContentIfNotHandled();
                            if (event != null) {
                                setupHomeActivity();
                            }
                        });


    }
    public void setupHomeButton() {
        Button homeButton = (Button) getActivity().findViewById(R.id.tab_home);

        homeButton.setOnClickListener(v -> laoDetailViewModel.openHome());
    }
    private void setupHomeActivity() {
        Intent intent = new Intent(getActivity(), HomeActivity.class);
        getActivity().setResult(HomeActivity.LAO_DETAIL_REQUEST_CODE, intent);
        getActivity().finish();
    }



}


