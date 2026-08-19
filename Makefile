NAME = stream-for-all
VERSION = $(shell python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
FILES = manifest.json popup.html popup.js background.js room.html room.js onboarding.js crypto.js groups.js mock.js streamQuality.js videoGrid.js sounds.js strings.js config.js tokens.css trystero-nostr.min.js components images

RELEASE_DIR = release
WEB_REPO = ../leocoout.github.io
WEB_DIR = $(WEB_REPO)/stream-for-all/app
WEB_FILES = manifest.json room.js onboarding.js crypto.js groups.js mock.js streamQuality.js videoGrid.js sounds.js strings.js config.js tokens.css trystero-nostr.min.js components images

zip: bump
	rm -rf $(RELEASE_DIR)
	mkdir -p $(RELEASE_DIR)
	zip -r $(RELEASE_DIR)/$(NAME)-$(VERSION).zip $(FILES) -x "components/.gitkeep"
	@echo "Created $(RELEASE_DIR)/$(NAME)-$(VERSION).zip"

bump:
	@python3 -c "import json; m=json.load(open('manifest.json')); a=m['version'].split('.'); a[1]=str(int(a[1])+1); a[2]='0'; m['version']='.'.join(a); open('manifest.json','w').write(json.dumps(m,indent=2)+'\n'); print('Version bumped to', m['version'])"

zip-nobump:
	rm -rf $(RELEASE_DIR)
	mkdir -p $(RELEASE_DIR)
	zip -r $(RELEASE_DIR)/$(NAME)-$(VERSION).zip $(FILES) -x "components/.gitkeep"
	@echo "Created $(RELEASE_DIR)/$(NAME)-$(VERSION).zip"

web:
	rm -rf $(WEB_DIR)
	mkdir -p $(WEB_DIR)
	cp -R $(WEB_FILES) $(WEB_DIR)/
	cp room.html $(WEB_DIR)/index.html
	@cd $(WEB_REPO) && git add stream-for-all/app && \
	if git diff --cached --quiet; then \
		echo "No web app changes to deploy."; \
	else \
		git commit -m "Deploy Stream for All web app v$(VERSION)" && git push origin HEAD && \
		echo "Web app v$(VERSION) deployed."; \
	fi

clean:
	rm -rf $(RELEASE_DIR)

local:
	@echo "Onboarding  → http://localhost:8000/room.html"
	@echo "Popup       → http://localhost:8000/popup.html"
	@echo "Room mocks  → http://localhost:8000/room.html?mock=1  (🎛 panel: roles, party size, streamers, requests)"
	@echo "For access from other devices use: make local-net"
	@(sleep 1 && (open "http://localhost:8000/room.html" 2>/dev/null || xdg-open "http://localhost:8000/room.html" 2>/dev/null)) &
	@python3 -m http.server 8000

local-net:
	@python3 tools/local-https.py

test:
	@node tests/attack.mjs

.PHONY: zip bump zip-nobump web clean local local-net test
