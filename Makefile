NAME = stream-for-all
VERSION = $(shell python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
FILES = manifest.json popup.html popup.js background.js room.html room.js onboarding.js crypto.js groups.js mock.js streamQuality.js videoGrid.js sounds.js strings.js config.js tokens.css trystero-nostr.min.js components images

RELEASE_DIR = release

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

clean:
	rm -rf $(RELEASE_DIR)

local:
	@echo "Onboarding  → http://localhost:8000/room.html"
	@echo "Popup       → http://localhost:8000/popup.html"
	@echo "Room mocks  → http://localhost:8000/room.html?mock=1  (🎛 panel: roles, party size, streamers, requests)"
	@(sleep 1 && (open "http://localhost:8000/room.html" 2>/dev/null || xdg-open "http://localhost:8000/room.html" 2>/dev/null)) &
	@python3 -m http.server 8000

test:
	@node tests/attack.mjs

.PHONY: zip bump zip-nobump clean local test
