"""Offline authorization tests; never starts an agent or contacts an AI vendor."""
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request
from serve_secure import require_service, require_start


def request(key=""):
    return Request({"type": "http", "headers": [(b"x-agent-service-key", key.encode())]})


class AccessTests(unittest.TestCase):
    def assert_status(self, status, fn, req):
        with self.assertRaises(HTTPException) as raised:
            fn(req)
        self.assertEqual(raised.exception.status_code, status)

    def test_missing_configuration(self):
        with patch.dict(os.environ, {"AGENT_SERVICE_KEY": ""}):
            self.assert_status(503, require_service, request())

    def test_unauthorized(self):
        with patch.dict(os.environ, {"AGENT_SERVICE_KEY": "test-only-" * 4}):
            self.assert_status(401, require_service, request())
            self.assert_status(401, require_service, request("wrong"))
            self.assert_status(401, require_service, request("錯誤"))

    def test_closed_pilot_still_allows_operator_cleanup(self):
        key = "test-only-" * 4
        with patch.dict(os.environ, {"AGENT_SERVICE_KEY": key, "AI_PILOT_ENABLED": "false"}):
            require_service(request(key))
            self.assert_status(503, require_start, request(key))

    def test_authorized_start(self):
        key = "test-only-" * 4
        with patch.dict(os.environ, {"AGENT_SERVICE_KEY": key, "AI_PILOT_ENABLED": "true"}):
            require_start(request(key))


if __name__ == "__main__":
    unittest.main()
