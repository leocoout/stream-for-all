NAME = stream-for-all
VERSION = $(shell python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
FILES = manifest.json popup.html popup.js background.js landing.js room.html room.js onboarding.js crypto.js sounds.js strings.js config.js tokens.css trystero-nostr.min.js components

zip:
	rm -f $(NAME)-*.zip
	zip -r $(NAME)-$(VERSION).zip $(FILES) -x "components/.gitkeep"
	@echo "Created $(NAME)-$(VERSION).zip"

clean:
	rm -f $(NAME)-*.zip

local:
	@echo "Onboarding  → http://localhost:8000/room.html"
	@echo "Popup       → http://localhost:8000/popup.html"
	@echo "Room mocks  → http://localhost:8000/room.html?mock=1  (🎛 panel: roles, party size, streamers, requests)"
	@(sleep 1 && (open "http://localhost:8000/room.html" 2>/dev/null || xdg-open "http://localhost:8000/room.html" 2>/dev/null)) &
	@python3 -m http.server 8000

.PHONY: zip clean local
