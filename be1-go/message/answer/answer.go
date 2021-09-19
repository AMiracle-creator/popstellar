package answer

import (
	"encoding/json"
	message "student20_pop/message"

	"golang.org/x/xerrors"
)

// Answer defines the JSON RPC answer message
type Answer struct {
	message.JSONRPCBase

	ID     *int    `json:"id"`
	Result *Result `json:"result"`
	Error  *Error  `json:"error"`
}

// Result can be either a 0 int or a slice of messages
type Result struct {
	isEmpty bool
	data    []json.RawMessage
}

// UnmarshalJSON implements json.Unmarshaler
func (r *Result) UnmarshalJSON(buf []byte) error {
	// if the answer return is 0, then we get the ascii value of 0, which equals
	// to 48
	if len(buf) == 1 && buf[0] == 48 {
		r.isEmpty = true
		return nil
	}

	err := json.Unmarshal(buf, &r.data)
	if err != nil {
		return xerrors.Errorf("failed to unmarshal data: %v", err)
	}

	return nil
}

// IsEmpty tells if there are potentially 0 or more messages in the result.
func (r Result) IsEmpty() bool {
	return r.isEmpty
}

// GetData returns the answer data. It can be nil in case the return is empty.
func (r *Result) GetData() []json.RawMessage {
	return r.data
}
