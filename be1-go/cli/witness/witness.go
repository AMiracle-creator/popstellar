package witness

import (
	"context"
	"encoding/base64"
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/urfave/cli/v2"
	"golang.org/x/xerrors"
	"log"
	"net/url"
	"student20_pop"
	"student20_pop/hub"
	"sync"
)

// Serve parses the CLI arguments and spawns a hub and a websocket server.
func Serve(cliCtx *cli.Context) error {

	// get command line args which specify public key, organizer address, port for organizer,
	// clients, witnesses, other witness' addresses
	organizerAddress := cliCtx.String("organizer-address")
	organizerPort := cliCtx.Int("organizer-port")
	clientPort := cliCtx.Int("client-port")
	witnessPort := cliCtx.Int("witness-port")
	otherWitness := cliCtx.StringSlice("other-witness")
	pk := cliCtx.String("public-key")
	if pk == "" {
		return xerrors.Errorf("witness' public key is required")
	}

	// decode public key and unmarshal public key
	pkBuf, err := base64.URLEncoding.DecodeString(pk)
	if err != nil {
		return xerrors.Errorf("failed to base64url decode public key: %v", err)
	}

	point := student20_pop.Suite.Point()
	err = point.UnmarshalBinary(pkBuf)
	if err != nil {
		return xerrors.Errorf("failed to unmarshal public key: %v", err)
	}

	// create organizer hub
	h := hub.NewWitnessHub(point)

	// make context release resources associated with it when all operations are done
	ctx, cancel := context.WithCancel(cliCtx.Context)
	defer cancel()

	// create wait group which waits for goroutines to finish
	wg := &sync.WaitGroup{}

	// increment wait group and connect to organizer's witness server
	err = connectToSocket(ctx, hub.OrganizerSocketType, organizerAddress, h, organizerPort, wg)
	if err != nil {
		return xerrors.Errorf("failed to connect to organizer: %v", err)
	}

	// increment wait group and connect to other witnesses
	for _, otherWit := range otherWitness {
		err = connectToSocket(ctx, hub.WitnessSocketType, otherWit, h, organizerPort, wg)
		if err != nil {
			return xerrors.Errorf("failed to connect to witness: %v", err)
		}
	}

	// increment wait group and create and serve servers for witnesses and clients
	clientSrv := hub.CreateAndServeWS(ctx, hub.WitnessHubType, hub.ClientSocketType, h, clientPort, wg)
	witnessSrv := hub.CreateAndServeWS(ctx, hub.WitnessHubType, hub.WitnessSocketType, h, witnessPort, wg)

	// increment wait group and launch organizer hub
	go h.Start(ctx, wg)

	// shut down client server and witness server when ctrl+c received
	hub.ShutdownServers(ctx, clientSrv, witnessSrv)

	// wait for all goroutines to finish
	wg.Wait()

	return nil
}

func connectToSocket(ctx context.Context, socketType hub.SocketType, address string, h hub.Hub, port int, wg *sync.WaitGroup) error {
	var urlString string
	switch socketType {
	case hub.OrganizerSocketType:
		urlString = fmt.Sprintf("ws://%s:%d/%s/witness/", address, port, socketType)
	case hub.WitnessSocketType:
		if address == "" {
			return nil
		}
		urlString = fmt.Sprintf("ws://%s/%s/witness/", address, socketType)
	}

	u, err := url.Parse(urlString)
	if err != nil {
		return xerrors.Errorf("failed to parse connection url %s %v", urlString, err)
	}

	ws, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return xerrors.Errorf("failed to dial %v", err)
	}

	log.Printf("connected to %s at %s", socketType, urlString)

	switch socketType {
	case hub.OrganizerSocketType:
		organizerSocket := hub.NewOrganizerSocket(h, ws, wg)
		go organizerSocket.WritePump(ctx)
		go organizerSocket.ReadPump(ctx)
	case hub.WitnessSocketType:
		witnessSocket := hub.NewWitnessSocket(h, ws, wg)
		go witnessSocket.WritePump(ctx)
		go witnessSocket.ReadPump(ctx)
	}

	return nil
}
