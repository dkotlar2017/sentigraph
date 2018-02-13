$(document).ready(function(){

	$('select[name="save_hashtags"]').change(function(){

		if(this.value === "") {
			return;
		}

		var iframe = document.createElement('iframe');
		iframe.src = "/my-searches-chart?hashtag=%23" + this.value.replace('#', '');
		iframe.width = $(window).width();
		iframe.height = 300;
		iframe.scrolling = "no";
		iframe.frameBorder = "0";
		
		document.getElementById('chart-wrapper').innerHTML = '';
		document.getElementById('chart-wrapper').appendChild(iframe);

		var list = {}, cobj = obj[this.value], d, date, $div = $('<div></div>'),$center = $('<center></center>'), $table = $('<table cellspacing="0" cellpadding="5" border="1"></table>'), $tr, $td;

		if(typeof cobj === "undefined") {
			return;
		} 	

		for(var i = 0; i < cobj.length; i++) {
			d = new Date(cobj[i].dateAdded);
			date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

			if(typeof list[date] === "undefined") {
				list[date] = [];
			}

			list[date].push(cobj[i]);
		}

		$('#hashtag-results-wrapper').html('');
		$div.append($center);
		$center.append($table);
		for(var date in list) {
			$tr = $('<tr></tr>');
			$td = $('<td colspan="3"></td>');
			$td.html($('<div class="hashtag-results-date">' + new Date(list[date][0].dateAdded).toString().split(' ').splice(0, 4).join(' ')  + '</div>'));
			$tr.html($td);
			$table.append($tr);

			list[date].map(function(item) {
				var d = new Date(item.dateAdded), time,
				hours = d.getHours(),
				minutes = d.getMinutes(),
				seconds = d.getSeconds(),
				suf = "am";
				
				if(hours > 12) {
					hours -= 12;
					suf = "pm";
				} else if(hours === 0) {
					hours = "12";
				}

				if(minutes < 10) {
					minutes = "0" + minutes.toString();
				}

				if(seconds < 10) {
					seconds = "0" + seconds.toString();
				}

				time = hours + ":" + minutes + ":" + seconds + " " + suf;
				$tr = $('<tr></tr>');
				$td = $('<td></td>');
				$tr.append($td);
				$td.append($('<div class="hashtag-results-each">' + time + '</div>'));
				$td = $('<td></td>');
				$tr.append($td);
				$td.append($('<div><b>' + parseFloat(item.q).toFixed(2)  + '</b></div>'));
				$td = $('<td></td>');
				$tr.append($td);
				$td.html($('<div>delete</div>'));
				$table.append($tr);
			});
		}

		$('#hashtag-results-wrapper').html($div);
	});

});
