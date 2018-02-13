Date.prototype.addHours = function(h) {    
   this.setTime(this.getTime() + (h*60*60*1000)); 
   return this;   
}

exports.getDateForNames = function(hours) {
        var d = new Date();
                d.addHours(hours||0);

        var  year = d.getFullYear().toString().split('').splice(2,2).join(''),
                month = d.getMonth() + 1,
                date = d.getDate(),
                hours = d.getHours(),
                num;

        if(month < 10) {
                month = "0" + month.toString();
        }

        if(date < 10) {
                date = "0" + date.toString();
        }

        if(hours < 10) {
                hours = "0" + hours.toString();
        }

        num = year.toString() + month.toString() + date.toString() + hours.toString();
        return num;
};

exports.getDistanceFromJoy = function(docs) {
        var tones =  { 
            anger: 0,
            disgust: 0,
            fear: 0,
            joy: 0,
            sadness: 0 
        },
        total = 0;

        docs.forEach(function(item2){
                var item3 = null, nogood = true;
                if(typeof item2.emotion_tone === "undefined" || item2.emotion_tone === null) {
                    return;
                }

                for(var j = 0; j < item2.emotion_tone.length; j++) {
                    if(typeof item2.emotion_tone[j] === "undefined" || item2.emotion_tone[j] === null) {
                        return;
                    }
               }

		for(var j = 0; j < item2.emotion_tone.length; j++) {

                    item3 = item2.emotion_tone[j];

                    for(var i in tones) {
                        if(typeof item3[i] !== "undefined" && parseFloat(item3[i]) > 0) {
				nogood=false;
                            break;
                        }
                    }

			if(nogood) { return; }

                    for(var i in tones) {
                        if(typeof item3[i] !== "undefined") {
                            tones[i] += parseFloat(item3[i]);   
                        }
                    }
                }

                if(item2.emotion_tone.length > 0) {
                    total++;
                }
        });

        for(var i in tones) {
            tones[i] = parseFloat(tones[i] / total);
        }   
        var q = Math.sqrt( Math.pow(tones.anger * 3, 2) + Math.pow(tones.disgust * 2.5, 2) + Math.pow(tones.fear * 1.5, 2) + Math.pow(tones.sadness * 2, 2) + Math.pow(tones.joy, 2) ); 
        return {tones : tones, q : q };
    };
