/*interface file for actors*/
package actors

import (
	"fmt"
	"student20_pop/db"
	"student20_pop/define"
)

type Actor interface {
	//Public functions
	HandleWholeMessage(msg []byte, userId int) (message, channel, responseToSender []byte)
	//Private functions
	handlePublish(generic define.Generic) (message, channel []byte, err error)
	handleCreateLAO(msg define.Message, canal string, generic define.Generic) (message, channel []byte, err error)
	handleUpdateProperties(msg define.Message, canal string, generic define.Generic) (message, channel []byte, err error)
	handleWitnessMessage(msg define.Message, canal string, generic define.Generic) (message, channel []byte, err error)
	handleLAOState(msg define.Message, canal string, generic define.Generic) (message, channel []byte, err error)
	handleCreateRollCall(mag define.Message, canal string, generic define.Generic) ([]byte, []byte, error)
}

//general actors functions, act only in the "Sub" database
func handleSubscribe(generic define.Generic, userId int) error {
	params, err := define.AnalyseParamsLight(generic.Params)
	if err != nil {
		fmt.Printf("unable to analyse paramsLight in handleSubscribe()")
		return define.ErrRequestDataInvalid
	}
	return db.Subscribe(userId, []byte(params.Channel))
}

func handleUnsubscribe(generic define.Generic, userId int) error {
	params, err := define.AnalyseParamsLight(generic.Params)
	if err != nil {
		fmt.Printf("unable to analyse paramsLight in handleUnsubscribe()")
		return define.ErrRequestDataInvalid
	}
	return db.Unsubscribe(userId, []byte(params.Channel))
}

/* creates a message to publish on a channel from a received message. */
func finalizeHandling(canal string, generic define.Generic) (message []byte, channel []byte) {
	return define.CreateBroadcastMessage(generic), []byte(canal)
}
