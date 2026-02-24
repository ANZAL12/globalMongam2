from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from requests.exceptions import ConnectionError, HTTPError


def send_push_message(token, title, message, extra=None):
    try:
        response = PushClient().publish(
            PushMessage(to=token, title=title, body=message, data=extra)
        )
    except PushServerError as exc:
        print(f"Expo Server Error: {exc.errors}")
        # Encountered a server error when sending message, you should probably try again later.
        pass
    except (ConnectionError, HTTPError) as exc:
        print(f"Request Error: {exc}")
        # Network connection problems.
        pass
    except Exception as exc:
        print(f"General Push Error: {exc}")
        
    try:
        # We got a response back, but we don't know whether it's an error yet.
        # This call raises errors so we can handle them with normal exception
        # flows.
        response.validate_response()
    except DeviceNotRegisteredError:
        # Mark the push token as inactive
        print(f"DeviceNotRegisteredError for token {token}")
        from users.models import User
        User.objects.filter(expo_push_token=token).update(expo_push_token=None)
    except PushTicketError as exc:
        # Encountered some other per-notification error.
        print(
            f"Encountered some other per-notification error for token {token}: {exc.push_response.errors}"
        )
    except Exception as exc:
        print(f"Unexpected Validation error: {exc}")
        pass
