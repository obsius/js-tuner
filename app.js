Number.prototype.mod = function(n) {
	return ((this % n) + n) % n;
};

var data = {
	"tunings": {
		"standard": {
			"name": "Standard",
			"openNotes": ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
		},
		"openE": {
			"name": "Open E",
			"openNotes": ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4']
		},
		"openG": {
			"name": "Open G",
			"openNotes": ['D2', 'G2', 'D3', 'G3', 'B3', 'E4']
		}
	},
	"scales": {
		"minorBlues": {
			"name": "Minor Blues",
			"intervals": [0, 3, 5, 6, 7, 10, 12]
		},
		"majorBlues": {
			"name": "Major Blues",
			"intervals": [0, 2, 5, 7, 9, 12]
		},
		"minor": {
			"name": "Minor",
			"intervals": [0, 2, 3, 5, 7, 8, 11, 12]
		},
		"major": {
			"name": "Major",
			"intervals": [0, 2, 4, 5, 7, 9, 11, 12]
		}
	},
	"speeds": {
		"1": 1,
		"1/2": .5,
		"1/4": .25,
		"1/8": .125,
		"1/16": .0625
	}
};

window.jsTuner = {
	
	resourceURL: 'https://data.transitwinds.com/obsius.net/tuner/',
	fullScale: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
	intervals: ['R', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7'],
	colors: ['00bce6', 'ff842c', '00d24a', 'efff00', 'ae55ff', 'ff3f3f', '2961ff', '52fff7', 'ff5ac5', 'a6dd99', '1bff00', '7a15ff'],
	freqC0: 16.352,
	
	numFrets: 21,
	tuning: 'standard',
	key: 'E',
	scale: 'minorBlues',
	displayMode: 'notes',
	speed: .125,
	
	timer: null,
	playing: false,
	notes: {},
	
	frets: [],
	intervalMap: {},

	running: {},
	
	parseSciNote: function(note) {
		return {
			note: note.substring(0, note.length - 1),
			octave: parseInt(high.slice(-1))
		}
	},
	
	relPos: function(note) {
		
		if (note.slice(-1).match(/\d/)) {
			note = note.substring(0, note.length - 1);
		}
	
		return this.fullScale.indexOf(note);
	},
	
	absPos: function(note) {
	
		var octave = note.slice(-1);
		if (!octave.match(/\d/)) {
			octave = 0;
		}
		
		return octave * 12 + this.relPos(note);
	},
	
	noteFromOffset(offset) {
		return this.fullScale[offset % 12] + Math.floor(offset / 12);
	},
	
	noteFromStringFret(string, fret) {
		return this.noteFromOffset(this.absPos(data.tunings[this.tuning].openNotes[string]) + fret);
	},
	
	getScaleDiff: function(high, low) {
		return (this.absPos(high) - this.absPos(low)).mod(12);
	},
	
	renderNeck: function() {
		var self = this;
		
		// load audio
		this.preLoadNotes();
		
		$('#button-table').empty();
		
		// create interval mapping
		$.each(this.fullScale, function(k, note) {
			self.intervalMap[note] = self.intervals[self.getScaleDiff(note, self.key)];
		});

		// create neck
		for (var string = 0, fretID = 0; string < 6; ++string) {
		
			var openNotes = data.tunings[this.tuning].openNotes;
		
			var stringOffset = this.getScaleDiff(openNotes[string], 'C0');
			var $row = $('<tr></tr>');

			for (var fret = 0; fret <= this.numFrets; ++fret) {
			
				var i = stringOffset + fret;
				var note = this.fullScale[i % 12];
				var octave = Math.floor(i / 12);
				
				var ref = '';
				if ((string == 2 &&
					((fret % 12) == 2 ||
					(fret % 12) == 4 ||
					(fret % 12) == 6 ||
					(fret % 12) == 8)) ||
					((string == 1 || string == 3) && (fret % 11) == 0 && fret != 0)) {

					ref = 'ref';
				}
				
				this.frets[fretID] = {
					note: note,
					noteOffset: $.inArray(note, this.fullScale),
					stringPosition: fret,
					octave: octave,
					string: string,
					root: fret == 0
				};
				
				var fretDisplay = (this.displayMode == 'notes') ? note : this.intervalMap[note];
				
				$row.append($('<td class="note"><div class="' + ref + '"></div><div class="button" data-fret-id="' + fretID++ + '">' + fretDisplay + '</div></td>'));
			}
			
			$('#button-table').prepend($row);
		}

		// color neck
		switch($('#highlight-select').val()) {
			case 'all':
				$('.button').each(function() {
					var fretInfo = self.frets[$(this).data('fret-id')];
					$(this).css('border-color', '#' + self.colors[fretInfo.noteOffset]);
				});
			break;
			case 'root':
				$('.button').css('border-color', '#CCCCCC');
				$('.button').each(function() {
					var fretInfo = self.frets[$(this).data('fret-id')];
					if (fretInfo.note == self.key) {
						$(this).css('border-color', '#' + self.colors[fretInfo.noteOffset]);
					}
				});
			break;
			case 'scale':
				$('.button').css('border-color', '#CCCCCC');
				
				var scaleNotes = [];
				var rootOffset = $.inArray($('#key-select').val(), self.fullScale);
				$.each(data.scales[$('#scale-select').val()].intervals, function(k, v) {
					scaleNotes.push(self.fullScale[(rootOffset + v).mod(12)]); 
				});
				
				$('.button').each(function() {
					var fretInfo = self.frets[$(this).data('fret-id')];
					if ($.inArray(fretInfo.note, scaleNotes) != -1) {
						$(this).css('border-color', '#' + self.colors[fretInfo.noteOffset]);
					}
				});
			break;
		}
	},

	preLoadNotes: function() {

		let loads = 0;

		for (var string = 0; string < 6; ++string) {
			for (var fret = 0; fret <= this.numFrets; ++fret) {

				loads++;

				var audio = new Audio(this.resourceURL + string + fret + '.mp3');
				audio.preload = 'auto';
				if (!this.notes[string]) { this.notes[string] = {}; }
				this.notes[string][fret] = audio;

				['error', 'canplaythrough'].forEach(function(event) {
					audio.addEventListener(event, function() {
						if (!--loads) {
							$('#go').prop('disabled', false);
						}
					});
				});
			}
		}
	},

	go: function() {
	
		var self = this;

		$('#tab-text').html('[Intro]\n\n 3/4                                                     \ne||----------------|-------------|-------------|-------------|\nB||----1-------1---|---0---------|---0---------|-------------|\nG||--------2-------|--0----------|--0--2---0---|---2---------|\nD||----------------|-------------|-------------|--2----------|\nA||----0-----------|-------------|-------------|-0-----------|\nE||----------------|-3---------2-|-0-----------|-------------|\n                                                         \ne|--------------|-------------|----------------|-------------|\nB|---0h1----0h1-|---0---------|---0----------0-|-------------|\nG|--2---2-------|--0----------|--0---2--0-0h2--|---2---------|\nD|--------------|-------------|----------------|--2----------|\nA|-0------------|-------------|----------------|-0-----------|\nE|--------------|-3---------2-|-0--------------|-------------|\n\n                   4/4                                 0\'20"\ne|-------------------|--0----------------|-----------------||\nB|-----------------3-|--------3-1---3----|---1-0-----------||\nG|-----0-----0---0---|------0---2--------|-----------------||\nD|---0-----0---------|-------------------|-2---------------||\nA|-------0-----2-----|--3----------------|-----------------||\nE|-3-----------------|-------------------|-----------------||\n\n\n[Part A]\n                                                       \ne||--------------------|-----------------|-----------------|\nB||--0h1p0-1-----1---0-|-----------------|-0---------0-----|\nG||----------2---------|-----0-----0-----|---2-0-2-------2-|\nD||----------------2---|---0-----0-----0-|-----------------|\nA||--0---------0-------|-----------------|-----------------|\nE||--------------------|-3-----2-----0---|-0-------0---0---|\n                                                     \ne|------------------||-----------------|-----------------|\nB|------------------||-------0-----0-1-|-----1-----3-----|\nG|-----2-----2-----*||-----2-----0-----|---2-----0-----0-|\nD|---2-----2-----2-*||---2-------------|-----------------|\nA|-0-----0-----0----||-0---------------|-0-----2-----2---|\nE|------------------||---------3-------|-----------------|\n\n6/4                    4/4                               \ne|--0--------------------|-----------------|-----------------|\nB|-------3-1--3----1p0---|-----------------|-------0-----0-1-|\nG|-----0---2---------0---|-2-----0-2-2---0-|-2---2-----0-----|\nD|---------------2-------|---------2-------|---2-------------|\nA|--3--------------------|-----------------|-0---------------|\nE|-----------------------|-1-------0-------|---------3-------|\n\n                 3/4                                        0\'54"\ne|-----------------|--0-----1-----|-2-----3-----|-4---5p0--7----||\nB|-----1-----3-----|----1-----1---|---1-----0---|---0----0---0--||\nG|---2-----0-----0-|------0-----2-|-----2-----0-|---------------||\nD|-----------------|--------------|-0-----------|---------------||\nA|-0-----2-----2---|--3-----------|-------------|---------------||\nE|-----------------|--------1-----|-------3-----|-0-------------||\n\n\n[Part B]\n\n4/4                                                  \ne||--8-7-------------|---------5-------|-8-7-------------|\nB||-----10-8--10---7-|--10-7-----5-----|----10-8--10---7-|\nG||--------9---9---7-|-----7-----5-----|-----------9---7-|\nD||------------------|-0-----0---------|-----------------|\nA||--0-------0---0---|-------------0---|-0-------0---0---|\nE||------------------|-----------------|-----------------|\n                                                     \ne|-------5----------|-8-7-------------|-----8----------3-|\nB|---8-----7------0-|----10-8--10---7-|----10-10-8-----3-|\nG|---9-----7----0---|-------9---9---7-|----------9-------|\nD|-0---0-----0h2----|-----------------|-0-0--------0-----|\nA|------------------|-0-------0---0---|------------------|\nE|------------------|-----------------|------------------|\n\n5/4                    6/4                     \ne|------------1----------|---0-----0-----0-----0---|\nB|------5-----1-----3----|---3-----3-----3-----3---|\nG|------5-----2-----3----|---2-----2-----2-----2---|\nD|------5-0---------3-0--|-------------------------|\nA|----5-----------1------|-0-----0-----0-----0-----|\nE|--3-------1---1--------|-------------------------|\n\n4/4                                1\'10"\ne|----------------0-|------------------||\nB|------------3-----|---3---------3p0--||\nG|--------2---------|-------2---2------||\nD|----3-------------|---------3--------||\nA|--0---------------|------------------||\nE|------------------|------------------||\n\n\n[Part C]\n                                                        \ne||-------------------|-----------------|-------------------|\nB||-0h1p0-1---------3-|-----1-----0-----|-0h1p0-1---------0-|\nG||---------2-----2---|-----------------|---------2-----2---|\nD||-------------2-----|---2-----2-----2-|-------------2-----|\nA||-0---------0-------|-0-----0-----0---|-0---------0-------|\nE||-------------------|-----------------|-------------------|\n                                                     \ne|-----------------|-------------------|-----------------|\nB|-----------------|-0h1p0-1---------0-|-----1-----3-----|\nG|-----2-----0-----|---------2-----2---|-----------------|\nD|---2-----2-----2-|-------------2-----|---2-----2-----2-|\nA|-0-----0-----0---|-0---------0-------|-0-----0-----0---|\nE|-----------------|-------------------|-----------------|\n\n                                  1\'22"\ne|-----------------|------------------||\nB|-5---5-3---3-1---|-1-0---0---0-1-0--||\nG|---5-----4-----2-|-----0---2--------||\nD|-----------------|------------------||\nA|-0-----0-----0---|---0-----0--------||\nE|-----------------|------------------||');
		
		for (var i = 0; i < 24; ++i) {
			$('#frets-select').append($('<option value="' + i + '" ' + ((self.numFrets == i) ? 'selected="selected"' : '') + '>' + i + '</option>'));
		}
		
		$.each(data.tunings, function(k, v) {
			$('#tuning-select').append($('<option value="' + k + '" ' + ((self.tuning == k) ? 'selected="selected"' : '') + '>' + v.name + '</option>'));
		});
		
		$.each(data.scales, function(k, v) {
			$('#scale-select').append($('<option value="' + k + '" ' + ((self.scale == k) ? 'selected="selected"' : '') + '>' + v.name + '</option>'));
		});
		
		$.each(this.fullScale, function(k, v) {
			$('#key-select').append($('<option value="' + v + '" ' + ((self.key == v) ? 'selected="selected"' : '') + '>' + v + '</option>'));
		});
		
		$.each(data.speeds, function(k, v) {
			$('#speed-select').append($('<option value="' + v + '" ' + ((self.speed == v) ? 'selected="selected"' : '') + '>' + k + '</option>'));
		});
		
		$('#go').on('click', function(e) {
			if (!self.playing) {
				self.playTab();
			} else {
				self.stopTab();
			}
		});
		
		$('select').on('change', function(e) {
		
			var val = $(e.currentTarget).val();
			switch ($(e.currentTarget).attr('id')) {
				case 'tuning-select':
					self.tuning = val;
				break;
				case 'scale-select':
					self.scale = val;
				break;
				case 'key-select':
					self.key = val;
				break;
				case 'frets-select':
					self.numFrets = parseInt(val);
				break;
				case 'display-select':
					self.displayMode = val;
				break;
				case 'speed-select':
					self.speed = val;
					return;
				break;
			}
			
			self.renderNeck();
		});
		
		$(document).on('click', '.button', function(e) {
			var fretInfo = self.frets[$(e.target).data('fret-id')];
			self.playNote(fretInfo.string, fretInfo.stringPosition);
		});
		
		this.renderNeck();
	},
	
	playNote: function(string, fret, callback) {
		var self = this;

		var fretID = string * (this.numFrets + 1) + fret;
		var $button = $('[data-fret-id = ' + fretID + ']');

		var info = this.running[string];
		if (info) {
			if (info.audio) {
				info.audio.pause();
				info.audio.currentTime = 0;
			}
			
			if ($button != info.$button) {
				info.$button.removeClass('active');
			}
		}

		var audio = this.notes[string][fret];
		
		try {
			audio.play();
			audio.onplay = function() {
			
				$button.addClass('active');
				
				self.running[string] = {
					$button: $button,
					audio: audio
				}
				
				audio.onended = function() {
					$button.removeClass('active');
				};
			};
		} catch (e) {
			console.log('no valid note for: ' + string + ':' + fret);
		}
	},
	
	tabsReader: function() {
		
		var validChars = /[0-9]/;
		var timeChars = /[hpsborx\-\*=L\\\/\{\}\(\)\^]/;
		var timeSeries = {};
	
		var lines = $('#tab-text').val().split('\n');
		var maxTime;
		
		var textData = '';

		
		for (var i = 0, time = 0; i < lines.length; time += maxTime) {
		
			maxTime = 0;
			
			if (!lines[i].match(/.*---.*/)) { textData += lines[i++] + '<br/>'; continue; }
			
			for (var string = 5; string >= 0 && i < lines.length; --string, ++i) {
		
				var line = lines[i];
				var buffer = '';

				for (var i2 = 0, lineTime = 0; i2 < line.length; ++i2) {
					var char = line[i2];
					var ctime = time + lineTime;
					
					if (char.match(validChars) || char.match(timeChars)) { ++lineTime; }
					if (char == '|') { --lineTime;}
					
					if (!char.match(validChars)) {
						if (buffer.length) {
							if (!timeSeries[ctime]) { timeSeries[ctime] = {}; }

							timeSeries[ctime][string] = parseInt(buffer);
							buffer = '';
						}
					} else {
						buffer += char;
					}
					
					textData += '<span data-ref="' + ctime + '">' + char + '</span>';
					
					if (lineTime > maxTime) { maxTime = lineTime; }
				}
				
				textData += '<br/>';
			}
		}
		
		$('#tab-show').html(textData);
		
		return timeSeries;
	},
	
	stopTab: function() {
		
		$('#go').html('Play');
		$('#tab-show').hide();
		$('#tab-text').show();
		
		clearInterval(this.timer);
		this.playing = false;
	},
	
	playTab: function() {
		var self = this;
		var timeSeries = this.tabsReader();
		var lastTime = parseInt(_.last(_.keys(timeSeries)));

		$('#go').html('Stop');
		$('#tab-show').show();
		$('#tab-text').hide();
		
		
		var i = 0;
		this.timer = setInterval(function() {
		
			if (timeSeries[i]) {
				$.each(timeSeries[i], function(k, v) {
					self.playNote(k, v);
				});
			}
			
			$('.active-time').removeClass('active-time');
			$('[data-ref="' + i + '"]').addClass('active-time').get(0).scrollIntoView();
			
			if (i++ == lastTime) { self.stopTab(); }
			
		}, self.speed * 1000);
		
		self.playing = true;
	}
};

$(function() {
	jsTuner.go();
});