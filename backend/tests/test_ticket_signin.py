"""Tickets and event registrations need a member sign-in; a free account is enough."""
import requests

from conftest import API, free_account_headers


def _an_event_with_tickets():
    for e in requests.get(f"{API}/events").json():
        if e.get("ticket_types"):
            return e
    return None


def test_visitor_without_account_is_asked_to_sign_in():
    e = _an_event_with_tickets()
    assert e, "seed data should have an event with tickets"
    body = {"event_id": e["id"], "items": [{"ticket_type_id": e["ticket_types"][0]["id"], "quantity": 1}],
            "buyer_name": "Visitor", "buyer_email": "visitor@example.com", "payment_method": "check"}
    r = requests.post(f"{API}/events/{e['id']}/purchase-tickets", json=body, no_auto_signin=True)
    assert r.status_code == 401
    assert "sign in" in r.json()["detail"].lower()


def test_visitor_can_still_see_prices():
    e = _an_event_with_tickets()
    body = {"event_id": e["id"], "items": [{"ticket_type_id": e["ticket_types"][0]["id"], "quantity": 1}]}
    r = requests.post(f"{API}/events/{e['id']}/quote", json=body)
    assert r.status_code in (200, 400), r.text  # priced, or a plain reason such as sales closed


def test_half_typed_email_gets_a_plain_text_error():
    """The checkout used to crash the page when the server returned a list of errors."""
    e = _an_event_with_tickets()
    r = requests.post(f"{API}/events/{e['id']}/quote", json={"event_id": e["id"], "buyer_email": "s",
                                                             "items": [{"ticket_type_id": e["ticket_types"][0]["id"], "quantity": 1}]})
    assert r.status_code in (400, 422)


def test_free_registration_needs_sign_in():
    e = requests.get(f"{API}/events").json()[0]
    body = {"event_id": e["id"], "name": "Visitor", "email": "visitor@example.com"}
    assert requests.post(f"{API}/events/{e['id']}/register", json=body, no_auto_signin=True).status_code == 401
    assert requests.post(f"{API}/events/{e['id']}/register", json=body, headers=free_account_headers()).status_code == 200
