var guageChartData, chart, chart_options = {
          width: 500, height: 200,
          greenFrom: 0, greenTo: 35,
          redFrom: 70, redTo: 100,
          yellowFrom:35, yellowTo: 70,
          minorTicks: 5
        },
	currentQ = null,
	currentHashtag = null;

function sendTwitterHashtag() {
	$('.ajax-loader img').show();
	$('.submit').attr('disabled', 'true');
	$('.grad-scale').hide();

	var v = $('input[name="hashtag"]').val();

	$('.sentence-results-wrapper').html('');

	if (!v.match(/^#.*$/gi)) {
		v = '#' + v;
	}

	$.ajax({
		url : "/get-twitter-hashtag-data",
		method : "post",
		dataType : "json",
		data : { hashtag : v }
	}).done(function(data){
		var n, t, pos;

		$('.ajax-loader img').hide();

		if(data.err) {
			switch(data.code){
				case "HASHTAG_NOT_FOUND":
					$('.sentence-results-wrapper').html("The hashtag <i>" + v + "</i> was not found");
				break;
				
				case "NULL_RESULTS":
					$('.sentence-results-wrapper').html("<i>" + v + "</i> could not be Graphed. Please retry again later.");
				break;
				default:
					$('.sentence-results-wrapper').html(data.message);
					break;
			}
		} else {
			$('.sentence-results-wrapper').html('<i>' +v + '</i> has an index of <b>' + data.q.toFixed(2) + '</b>');
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

			guageChartData.setValue(0, 1, parseInt(n));
			chart.draw(guageChartData, chart_options);
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

$(document).ready(function(){
	$('.ajax-loader img').hide();

	$('input[name="hashtag"]').focus();

	google.charts.load('current', {'packages':['gauge']});
	google.charts.setOnLoadCallback(drawChart);	

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
});
