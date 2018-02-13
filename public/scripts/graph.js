 $(document).ready(function(){
$('#circle-results-chart').slideUp();

return;
    $("circle").draggable().bind('mousedown', function(event, ui){
      // bring target to front
      $(event.target.parentElement).append(event.target);

    }).bind('drag', function(event, ui){
      var xdiff = parseInt(event.target.getAttribute('cx')) - parseInt(ui.position.left), 
        ydiff = parseInt(event.target.getAttribute('cy')) - parseInt(ui.position.top);

      event.target.setAttribute('cx', ui.position.left);
      event.target.setAttribute('cy', ui.position.top);

      if(event.target.id === "main") {

        moveall(xdiff, ydiff);

      } else {
        document.getElementById('line-' + event.target.id).setAttribute('x2', ui.position.left);
        document.getElementById('line-' + event.target.id).setAttribute('y2', ui.position.top);
      }
    });

    $('svg').bind('mouseup', function(event){
      setTimeout(function(){
        $('line').each(function(){
          this.setAttribute('x1', document.getElementById('main').getAttribute('cx'));
          this.setAttribute('y1', document.getElementById('main').getAttribute('cy'));      
        });  
      }, 200);    
    });

});

function moveall(xdiff, ydiff) {
  $('line').each(function(){
    this.setAttribute('x1', document.getElementById('main').getAttribute('cx'));
    this.setAttribute('y1', document.getElementById('main').getAttribute('cy'));
    this.setAttribute('x2', parseInt(this.getAttribute('x2')) - xdiff);
    this.setAttribute('y2', parseInt(this.getAttribute('y2')) - ydiff);          
  });

  $('circle').each(function(){
     this.setAttribute('cx', parseInt(this.getAttribute('cx')) - xdiff);
     this.setAttribute('cy', parseInt(this.getAttribute('cy')) - ydiff);         
  });
}

