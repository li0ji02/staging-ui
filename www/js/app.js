// When the document is ready
jQuery(document).ready(function ($) {
	console.log('Document is ready');

	// Initialize the EDL side nav
	portalNavUi.init(userContext, appContextSpi);

	// Refresh rate of the download progress
	var refreshRate = 2000;

	// The HTML template for a progress element
	progressItemTemplate = '<div class="progress-item row well well-sm" data-progress="0">'+
								'<p class="progress-label col-md-12"></p>'+
								'<div class="progress col-md-12">'+
									'<div aria-valuenow="0" class="progress-bar progress-bar-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">'+
										'<span class="sr-only hidden"><span class="percent-complete">0</span><small>%</small></span>'+
									'</div>'+
								'</div>'+
							'</div>';

	// Ask for the progress
	(function updateProgress() {
		$.ajax({
				type: 'GET',
				url: '/progress',
				async: true,
				cache: false,
				contentType: 'application/json; charset=utf-8',
				dataType: 'json'
			})
			.fail(function (jqXHR, textStatus, errorThrown) {
				console.log('ERROR: Error retrieving configuration');
				console.log(arguments);
				console.log(errorThrown);
				setTimeout(updateProgress, 1000 * 5);
				$('#section-download').addClass("hidden");
				$('#section-wait').removeClass("hidden");
			})
			.done(function (data) {
				$('#section-download').removeClass("hidden");
				$('#section-wait').addClass("hidden");

				var totalProgress = 0;	// The total progress (average of all items)
				var totalComplete = 0;	// The number of items complete

				$.each( data, function( index, item ){

					var progressName = item.ImageName.match(/[^\/]+$/gm, '')[0];

					// Find the element with the progressName if it exists
					var element = $('.progress-item[data-item-name="'+progressName+'"]');

					// If not already completed
					if (! element.hasClass('faded')) {

						// Total up progress of all progress items
						var progTotal   = 0;
						var progCurrent = 0;
						$.each( item.Prgress, function( index, prog ){
							if (prog.ProgressDetail !== null) {
								progTotal   += prog.ProgressDetail.Total;
								progCurrent += prog.ProgressDetail.Current;
							}
						});

						// Check for valid progTotal
						if (progTotal > 0) {
							var progPercent = Math.max(0, Math.min((progCurrent/progTotal)*100, 100));
						} else {
							var progPercent = 0;
						}

						// If the progress item does not exist, create it
						if (element.length == 0) {
							console.log('New Progress Item', item);

							// Append a new element
							$('#progress-item-container').append(progressItemTemplate);

							// Set the new elements ID, label
							element = $('.progress-item:last-of-type');
							element.attr('data-item-name', progressName);
							element.find('.progress-label').text(progressName);
						}

						// Catch downloads that reset to 0 after being complete
						// TODO: This is probably a bad idea, but otherwise something server-side needs to change
						if (progPercent == 0 && element.attr('data-progress') > 80) {
							progPercent = 100;
						}



						// Can't go backwards
						if (progPercent >= element.attr('data-progress')) {
							// Update the elements progress
							element.attr('data-progress', progPercent);
							element.find('.progress-bar').css('width', progPercent+'%');
							element.find('span.percent-complete').text(progPercent);
						} else {
							console.log("Progress went backwards");
						}

						// If complete, change contextual classes
						if (progPercent >= 100) {
							setProgressComplete(element);
						}
					} else {
						// Already complete, update totals
						progPercent = 100;
						totalComplete++;
					}

					totalProgress += progPercent;
				});

				// Calculate total progress by dividing by the number of progress items
				if (data.length > 0) {
					totalProgress = Math.floor(totalProgress/data.length);
				}

				// Update the total progress bar
				$('.progress-total').find('.progress-label').text(totalComplete+'/'+data.length+' Complete');
				$('.progress-total .progress-bar').css('width', totalProgress+'%');
				$('.progress-total').find('span.percent-complete').text(totalProgress);

				// If everything is complete
				if (totalProgress >= 100 && data.length > 0) {
					setProgressComplete($('.progress-total'));
					allItemsComplete();
				} else {
					$('#section-download').removeClass("hidden");
					$('.progress-total').find('.progress-bar')
							.addClass('progress-bar-info')
							.addClass('progress-bar-striped')
							.removeClass('progress-bar-success');
					$('.progress-total').removeClass('faded');

					setTimeout(updateProgress, refreshRate);
				}

				sortByProgress();
			});
	})();

	// Add/Remove contextual classes
	function setProgressComplete(element) {
		element.find('.progress-bar')
				.removeClass('progress-bar-info')
				.removeClass('progress-bar-striped')
				.addClass('progress-bar-success');
		element.addClass('faded');
	}

	// All items are completed
	function allItemsComplete() {

		$('#section-download').addClass("hidden");
		$('#section-wait').removeClass("hidden");

		setTimeout(refreshPageLoop, 1000 * 5);
	}

	// Reload the page every 5 seconds
	function refreshPageLoop() {
		location.reload();
		setTimeout(refreshPageLoop, 1000 * 5);
	}

	// Sort progress items by progress
	function sortByProgress() {
		var $wrapper = $('#progress-item-container'),
		$items = $wrapper.find('.progress-item');
		[].sort.call($items, function(a,b) {
			return +$(a).attr('data-progress') - +$(b).attr('data-progress');
		});
		$wrapper.append($items);
	}
});