$(document).ready(function(){
	function drawGraph(q1) {
		 var line = new RGraph.Line({
		    id:'cvs',
		    data: [
			q1.map(function(item){ return item.q * 10; })
		    ],
		    options: {
			labels: q1.map(function(item) { return '|'; }), //[1,2,3,4,5,6,7,8,9,10,11,12],
			gutterBottom: 24,
			linewidth: 1,
			adjustable: false,
			title: 'Sentigraph Index (si)',
			titleVpos: 0.5,
			spline: true,
			tickmarks: 'circle',
			ticksize: 3
		    }
		}).trace();
	}

	drawGraph(q1);
});
