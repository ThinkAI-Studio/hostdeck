package services

import (
	"context"
	"errors"
	"net"
	"testing"
	"time"

	"github.com/bnhminh1010/homelab-dashboard/internal/model"
)

func TestValidateUDPURLAcceptsValidEndpointsAndRejectsUnsafe(t *testing.T) {
	valid := []string{
		"udp://10.0.0.1:51820",
		"udp://100.64.0.10:123",
		"udp://[fd7a:115c:a1e0::1]:514",
		"udp://wireguard.internal:51820",
	}
	for _, value := range valid {
		if err := validateUDPURL(value); err != nil {
			t.Fatalf("valid UDP endpoint %q rejected: %v", value, err)
		}
	}

	invalid := []string{
		"",
		"udp://",
		"udp://10.0.0.1",
		"udp://10.0.0.1:0",
		"udp://10.0.0.1:70000",
		"udp://user:pass@10.0.0.1:51820",
		"udp://10.0.0.1:51820/path",
		"udp://10.0.0.1:51820?query=1",
		"udp://10.0.0.1:51820#hash",
		"http://10.0.0.1:51820",
		"tcp://10.0.0.1:51820",
	}
	for _, value := range invalid {
		if err := validateUDPURL(value); err == nil {
			t.Fatalf("invalid UDP endpoint %q accepted", value)
		}
	}
}

type mockUDPConn struct {
	net.Conn
	closed bool
}

func (m *mockUDPConn) Write(b []byte) (int, error) {
	return len(b), nil
}

func (m *mockUDPConn) Read(b []byte) (int, error) {
	return 0, &mockTimeoutError{}
}

func (m *mockUDPConn) SetDeadline(t time.Time) error {
	return nil
}

func (m *mockUDPConn) Close() error {
	m.closed = true
	return nil
}

type mockTimeoutError struct{}

func (e *mockTimeoutError) Error() string   { return "i/o timeout" }
func (e *mockTimeoutError) Timeout() bool   { return true }
func (e *mockTimeoutError) Temporary() bool { return true }

func TestProberUDPProbe(t *testing.T) {
	var dialedNetwork, dialedAddress string
	mockConn := &mockUDPConn{}
	prober := &Prober{
		dialContext: func(_ context.Context, network, address string) (net.Conn, error) {
			dialedNetwork, dialedAddress = network, address
			return mockConn, nil
		},
	}

	result := prober.Probe(context.Background(), "udp://10.0.0.1:51820")
	if result.Status != model.ServiceStatusUp {
		t.Fatalf("UDP probe status = %s, want up", result.Status)
	}
	if dialedNetwork != "udp" || dialedAddress != "10.0.0.1:51820" {
		t.Fatalf("dialed %s %s, want udp 10.0.0.1:51820", dialedNetwork, dialedAddress)
	}
	if !mockConn.closed {
		t.Fatalf("expected UDP connection to be closed")
	}

	// Test dial failure
	failingProber := &Prober{
		dialContext: func(_ context.Context, _, _ string) (net.Conn, error) {
			return nil, errors.New("dial failed")
		},
	}
	failResult := failingProber.Probe(context.Background(), "udp://10.0.0.1:51820")
	if failResult.Status != model.ServiceStatusDown {
		t.Fatalf("expected down status on dial failure, got %s", failResult.Status)
	}
}
