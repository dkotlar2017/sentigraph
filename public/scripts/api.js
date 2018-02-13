
$(document).ready(function(){
	var twtmsg = 'Please write in a twitter hashtag',
		normsg = 'Please write your sentence';

	$('select[name="msgtype"]').change(function(){
		if(this.value === "twitter"){
			$('input[name="msg"]').attr('placeholder', twtmsg);
		} else {
			$('input[name="msg"]').attr('placeholder', normsg);
		}
	});


	$('input[name="msg"]').change(function(){ 
		if(this.value === twtmsg || this.value === normsg || $('select[name="msgtype"]').val() !== "twitter") { 
			return;
		}  

		this.value = this.value.split(' ').map(function(item){ 
			if(item.replace(/\s+/g, '') !== "" && !/^#/g.test(item)) { 
				return '#' + item; 
			} else if(/^#/g.test(item)) {
				return item;
			}  
		}).join(' '); 
	});

	var line = new RGraph.Line({
            id:'cvs',
            data: [
                q1.map(function(item){ return item * 10; }), q2.map(function(item){ return item * 10; })
            ],
            options: {
                labels: [1,2,3,4,5,6,7,8,9,10,11,12],
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
});
