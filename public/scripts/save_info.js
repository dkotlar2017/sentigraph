$(document).ready(function(){
	$('#save-info-save-div').click(function(){
		var $this = $(this);

                $('#txnid').css({ "border-color": "black"});
                $('#txnid-warning-msg').hide();

		$.post('/check_txn', {txnid : $('#txnid').val()}, function(response){
			if(typeof response === "string") {
				response = $.parse(response);
			}
		
			if(response.success) {
				$('#txnid').css({ "border-color": "black"});
				$('#txnid-warning-msg').hide();
				$('#txnid-warning-msg2').hide();

				$this.parent().hide();
				$('#wallet-submit-wrapper').slideDown("slow");
			} else {
				if(!response.success && response.code === "INCORRECT TXN") { 
					$('#txnid').css({ "border-color": "red"});
					$('#txnid-warning-msg').show();
				} else if(!response.success && response.code === "TXN EXISTS") {
                                        $('#txnid').css({ "border-color": "red"});
                                        $('#txnid-warning-msg2').show();	
				}
			}
		});
	});

	$('.copy-to-clipboard').click(function(){
		var $p = $(this).parent(),
			$a = $p.children('.address-ro-input').first();

		$a.select();

		try {
			var successful = document.execCommand('copy');
		} catch (err) {
		}		
	});

	$('#submit-next-one').click(function(){
		if(!/^[\da-zA-Z]{35}$/g.test($('#walletid').val())) {
			$('#walletid').css({ "border-color": "red"});
			$('#walletid-warning-msg').show();
			return;
		}

		$('#walletid').css({ "border-color": "black"});
		$('#walletid-warning-msg').hide();		

		$('.sentence-pending-results-wrapper').first().slideUp("slow", function(){
			$('#save-info-save-div').parent().show();
			$($('.sentence-pending-results-wrapper')[1]).slideDown("slow");
		});
	});

        $('#submit-next-two').click(function(){                           
		$('#save-info-save-div').parent().hide();
		$('#wallet-submit-wrapper').hide();

                $($('.sentence-pending-results-wrapper')[1]).slideUp("slow", function(){ 
                        $($('.sentence-pending-results-wrapper')[0]).slideDown("slow", function(){
				$('#wallet-submit-wrapper').hide();
			});
                });
        });

	$('.radio-wrapper').click(function(e){
		var $t = $(e.target),
			v = $('#' + $t.attr('for')).val(),
			$p = $('#' + v + '-address-input').parents('.payment-address-wrapper').first();

		if($t.is("div")) {
			return;
		}

		$('.payment-address-wrapper:visible').slideUp("slow", function(){
			$p.slideDown("slow");
		});
	});
});


