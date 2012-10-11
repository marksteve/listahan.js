all: lib/listahan.js lib/listahan.min.js

lib/listahan.js: src/listahan.coffee
	coffee -cs < $< | cat lib/mousetrap.js - > $@

lib/listahan.min.js: lib/listahan.js
	closure-compiler --js $< --js_output_file $@
