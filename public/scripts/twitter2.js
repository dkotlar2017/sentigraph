var guageChartData, chart, chart_options = {
          width: 500, height: 200,
          greenFrom: 0, greenTo: 35,
          redFrom: 70, redTo: 100,
          yellowFrom:35, yellowTo: 70,
          minorTicks: 5
        },
	currentQ = null,
	currentHashtag = null;

function displayErrorMessage(m) {
	var $div = $('<div />');
	
	$('.error-message').remove();

	$div.addClass('error-message');
	$div.html(m);

	$('body').append($div);

	$div.css({
		top : (parseInt($('.input-group').offset().top) - 50) + "px",
		left: "0px"
	});

	setTimeout(function(){
		if($div.length && $div.is(':visible')) {
			$div.fadeOut(function(){
				$div.remove();
			});
		}
	}, 5000);
}

function sendTwitterHashtag() {
	var resultText = {
			"0.50" : "Excellent Initiative/High crowd approval",
			"0.70" : "Very Good Initiative/moderate crowd interest",
			"0.90" : "Fair initiative/Event/low crowd interest",
			"1.50" : "Manageable initiative/ crowd accommodation",
			"2.00" : "Struggling Initiative/ moderate crowd criticism",
			"10.00" : "Bad Idea / high crowd disapproval",
			"else" : "High crowd protest"
			};

	$('.ajax-loader').show();
	$('.submit').attr('disabled', 'true');
	$('.grad-scale').hide();

	var v = $('input[name="hashtag"]').val();

	$('.sentence-results-wrapper').html('');

	if (!v.match(/^#.*$/gi)) {
		v = '#' + v;
	}

	$.ajax({
	//	url : "/get-twitter-hashtag-data",
		url : '/gi-sim',
//		method : "post",
		dataType : "jsonp",
		data : { hashtag : v }
	}).done(function(data){
		var n, t, pos;

		$('.ajax-loader').hide();

		if(data.err) {
			switch(data.code){
				case "HASHTAG_NOT_FOUND":
					displayErrorMessage("Oops! " + v +  " is unavailable.");
					//$('.sentence-results-wrapper').html("The hashtag <i>" + v + "</i> was not found");
				break;
				
				case "NULL_RESULTS":
					$('.sentence-results-wrapper').html("<i>" + v + "</i> could not be Graphed. Please retry again later.");
				break;
				default:
					$('.sentence-results-wrapper').html(data.message);
					break;
			}
		} else {
//			$('.sentence-results-wrapper').html('<i>' +v + '</i> has an index of <b>' + data.q.toFixed(2) + '</b>');
			currentQ = data.q;
			currentHashtag = v;

			n = parseFloat(data.q) * 100 / 2.5;
			//$('.grad-scale-pointer img').css({left : parseInt(n) + "%"});
			//$('.grad-scale').show();

			if(data.isLoggedIn) {
				pos = $('input[name="hashtag"]').position();
				$('.save-hashtag-img').css({position: "absolute", top : parseInt(pos.top) + "px", left: (parseInt(pos.left) + 150) + "px"});
				$('.save-hashtag-img').show();
			}
			
			let indexWidth = window.innerWidth - 60;

			if (window.matchMedia("(orientation: landscape)").matches) {
				indexWidth = window.innerHeight - 90;
			}

			$('.twitter-form-wrapper').hide();
			$('.index-wrapper').html('');
			$('.results-text').html('');
			$('.index-wrapper').fadeIn(function(){
				$('.index-wrapper').css({display: "flex"});
			});
			$('.index-wrapper').append($('<canvas id="index-meter" height="' + indexWidth + '" width="' + indexWidth + '" />'));
			var $indexodo = $('<div class="index-odo"></div>');
			$indexodo.append($('<h2 class="index-tag">' + currentHashtag +'</h2>'));
			$indexodo.append($('<h1 class="index-result">' + (n / 100).toFixed(2) + '</h1>'));

			$('.index-wrapper').append($indexodo);

			setTimeout(function() {
				const meter = new indexMeter(document.getElementById('index-meter'));
				meter.drawScore((n / 100).toFixed(2));
				
				$('.results-bottom').fadeIn();
				setTimeout(function(){
					$('h1.index-result').html(currentQ.toFixed(2));
					
					for(let i in resultText) {
						if(parseFloat(i) >= currentQ.toFixed(2)) {
							$('.results-text').html(resultText[i]);
							break;
						}
					}
				}, 200);
			}, 100);
			//guageChartData.setValue(0, 1, parseInt(n));
			//chart.draw(guageChartData, chart_options);
		}
		$('.submit').removeAttr('disabled');
	});
	return false;
}

function drawChart() {
        guageChartData = google.visualization.arrayToDataTable([
          ['Label', 'Value'],
          ['S3pulse', 100]
        ]);

       chart = new google.visualization.Gauge(document.getElementById('guage-chart'));	
	guageChartData.setValue(0, 1, 1);
       chart.draw(guageChartData, chart_options);	

}


class indexMeter {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    // general settings
    this.middleX = canvas.width / 2;
    this.middleY = canvas.height / 2;
    this.radius = canvas.width / 2 - canvas.width / 40;
    // beginning and ending of our arc. Sets by rad * pi
    this.startAngleIndex = 0.9;
    this.endAngleIndex = 2.1;

    // zones settings
    this.zoneLineWidth = canvas.width / 20;
    this.counterClockwise = false;

    // ticks settings
    this.tickWidth = 2;
    this.tickColor = "#fff";
    this.tickOffsetFromArc = canvas.width / 40;

    this.zonesCount = 12;
    this.step = (this.endAngleIndex - this.startAngleIndex) / this.zonesCount;

    this.drawZones();
    this.drawUnderline();
  }

  drawUnderline() {
    const startAngle = this.startAngleIndex * Math.PI;
    const endAngle = this.endAngleIndex * Math.PI;
    this.ctx.beginPath();
    this.ctx.arc(this.middleX, this.middleY, this.radius - this.zoneLineWidth, startAngle, endAngle, this.counterClockwise);
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = "#392770";
    this.ctx.lineCap = "butt";
    this.ctx.stroke();
  }

  drawZone(options) {
    this.ctx.beginPath();
    this.ctx.arc(this.middleX, this.middleY, this.radius, options.startAngle, options.endAngle, this.counterClockwise);
    this.ctx.lineWidth = this.zoneLineWidth;
    this.ctx.strokeStyle = options.color;
    this.ctx.lineCap = "butt";
    this.ctx.stroke();
  };

  drawZones() {
    const redZonesCount = 3;
    const blankZonesCount = Math.ceil(this.zonesCount - redZonesCount);

    const startAngle = this.startAngleIndex * Math.PI;
    const endBlankAngle = (this.startAngleIndex + blankZonesCount * this.step) * Math.PI;
    const endRedAngle = this.endAngleIndex * Math.PI;

    const sectionOptions = [
        {
            startAngle: startAngle,
            endAngle: endBlankAngle,
            color: "transparent"
        },
        {
            startAngle: endBlankAngle,
            endAngle: endRedAngle,
            color: "rgba(214, 42, 255, 0.4)"
        }
    ];

    const self = this;
    sectionOptions.forEach(function(options) {
      self.drawZone(options);
    });
  };

  drawTick(angle, small=false, pink=false) {
      const fromX = this.middleX + (this.radius - this.tickOffsetFromArc) * Math.cos(angle);
      const fromY = this.middleY + (this.radius - this.tickOffsetFromArc) * Math.sin(angle);
      let tickLength = this.tickOffsetFromArc;
      let tickColor = this.tickColor;
      if(small) {
        tickLength = 0;
        tickColor = "#392770";
      }
      if(pink) {
        tickColor = "#ED0EFF";
      }
      const toX = this.middleX + (this.radius + tickLength) * Math.cos(angle);
      const toY = this.middleY + (this.radius + tickLength) * Math.sin(angle);

      this.ctx.beginPath();
      this.ctx.moveTo(fromX, fromY);
      this.ctx.lineTo(toX, toY);
      this.ctx.lineWidth = this.tickWidth;
      this.ctx.lineCap = "round";
      this.ctx.strokeStyle = tickColor;
      this.ctx.stroke();
  };

  drawTicks() {
    let counter = 0;
    for (let i = this.startAngleIndex; i <= this.endAngleIndex; i += this.step) {
        const angle = i * Math.PI;
        if (counter%3 === 0) {
          this.drawTick(angle);
        } else if (counter === 10 || counter === 11) {
          this.drawTick(angle, true, true);
        } else {
          this.drawTick(angle, true);
        }
        counter++;
    }
    this.drawTick(this.endAngleIndex * Math.PI);
  };

  mixColors(base, added) {
    let mix = [];
    mix[3] = 1 - (1 - added[3]) * (1 - base[3]); // alpha
    mix[0] = Math.round((added[0] * added[3] / mix[3]) + (base[0] * base[3] * (1 - added[3]) / mix[3])); // red
    mix[1] = Math.round((added[1] * added[3] / mix[3]) + (base[1] * base[3] * (1 - added[3]) / mix[3])); // green
    mix[2] = Math.round((added[2] * added[3] / mix[3]) + (base[2] * base[3] * (1 - added[3]) / mix[3])); // blue

    return mix;
  }

  // Score is measured between 0 and 1, duration is measured in ms
  drawScore(score, duration=1000) {
    const startAngle = this.startAngleIndex * Math.PI;
    const endAngle = (this.startAngleIndex + score * (this.endAngleIndex - this.startAngleIndex)) * Math.PI;
    const gradFragments = Math.ceil(endAngle - startAngle) * 30;
    const fragmentDuration = Math.ceil(duration / gradFragments);

    const fragmentLength = (endAngle - startAngle) / gradFragments;
    const bgColor = [38, 26, 75, 1];
    let i = 0;
    const self = this;
    function animationLoop() {
      setTimeout(function() {
        const start = startAngle + fragmentLength * i;

        self.ctx.globalCompositeOperation = "destination-over";
        self.ctx.beginPath();

        const colorIncrement = 1 / gradFragments;
        const colorStop = i * colorIncrement;
        const overlayColor = [80, 227, 194, colorStop];
        const mixedColor = self.mixColors(bgColor, overlayColor);

        self.ctx.strokeStyle = `rgba(${mixedColor.join(', ')})`;
        self.ctx.fillStyle = self.ctx.strokeStyle;
        self.ctx.arc(self.middleX, self.middleY, self.radius, start, start + fragmentLength);
        self.ctx.lineWidth = self.zoneLineWidth;
        self.ctx.lineCap = "butt";
        self.ctx.closePath();
        self.ctx.fill();
        self.ctx.stroke();
        self.ctx.globalCompositeOperation = "source-atop";

        if (++i < gradFragments) animationLoop();
      }, fragmentDuration);
    }
    animationLoop();

    this.drawTicks();
  }
}


$(document).ready(function(){
	$('.ajax-loader').hide();

	$('input[name="hashtag"]').focus();

	//google.charts.load('current', {'packages':['gauge']});
	//google.charts.setOnLoadCallback(drawChart);	

	$('.save-hashtag-img').click(function(){
		if(currentQ === null) {
			return;
		}
		var q = currentQ;
		currentQ = null;				

		$.post('/save-latest-result', {q : q, hashtag : currentHashtag }, function(response){
			$('.save-hashtag-img').fadeOut("slow", function(){
				var pos = $('input[name="hashtag"]').position();

				$('.save-hashtag-img').hide();
				$('.check-save-img').css({position: "absolute", top : parseInt(pos.top) + "px", left: (parseInt(pos.left) + 150) + "px"});
				$('.check-save-img').show();

				setTimeout(function(){
					$('.check-save-img').fadeOut(function(){
						$('.check-save-img').hide();
					});
				}, 3000);
			});

			
		});
	});

	$('.results-bottom').click(function(e) {
		e.preventDefault();
		$('.results-bottom').fadeOut();
		$('.index-wrapper').fadeOut(function(){
			$('.twitter-form-wrapper').fadeIn();
		});

		 $('.results-text').html('');
		return false;
	});

	$('.calc-form form').submit(function(e){
		e.preventDefault();
		sendTwitterHashtag();
		return false;
	});
	$('.submit').on('click', function(){
		sendTwitterHashtag();
	});

	$(document).on('touchstart', '.submit', function(){
		sendTwitterHashtag();
	});

	if(window.location.search.indexOf('search=')> -1) {
		let searchA = window.location.search.replace(/^\?/gi, '').split('&');

		searchA.forEach(function(item){
			if(item.indexOf('search=') > -1) {
				$('input[name="hashtag"]').val(item.replace('search=', ''));
				$('.submit').click();
			}
		});
	}
});
