import unittest

from NOVA.operational_observer import normalize_content


class ObserverTests(unittest.TestCase):
    def test_normalize_content_removes_html_noise(self):
        content = "<html><script>bad()</script><body>Hello   NOVA</body></html>"
        self.assertEqual(normalize_content(content), "Hello NOVA")


if __name__ == "__main__":
    unittest.main()
