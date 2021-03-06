'use strict';

define([
	'./Constants',
	'jquery',
	'jquery-ui'
],
function(Constants){

function SearchController(app)
{
	this.app = app;
	
	this.textbox = $('#searchInputBox');
	this.button = $('#searchButton');
	this.results = $('#searchResultsContents');
	this.canvas = $('#canvas');
	
	/** Events 'n stuff **/
	
	// Search button
	this.button.button();
	this.button.click(function() {
		this.DoSearch(this.textbox[0].value);
	}.bind(this));

  this.textbox.change(function() {
    this.DoSearch(this.textbox[0].value);
  }.bind(this));
}

// I originally had this function be anonymous. Then I realized that (assuming no smart
// optimizations from the javascript engine) it would be created potentially hundreds of
// times (one for each search result). So now it's named.
function NoDrag(event)
{
	event.preventDefault();
}


SearchController.prototype.CreateSearchResult = function(result)
{
	var elem = $('<div></div>')
				.attr('id', result.id)
                .data('metadata', result)
				.addClass('searchResultContainer')
				.append($('<span>' + result.name + '</span>')
                    .attr('title', result.name + ", unit: " + result.unit))
				.append($('<img src="' +
				          Constants.imageDir + result.id +
				          '.jpg"></img>')
				.bind('dragstart', NoDrag));
				
	elem.mousedown(function() {
	   this.ResultSelected(elem.attr('id'));
  }.bind(this));
	
	return elem;
};

SearchController.prototype.ResultSelected = function(mid)
{
	var resultElem = $('#'+mid);
	// Ignore repeated clicks on selected results
	if (resultElem.hasClass('selected'))
		return;
	
	this.app.ToggleBusy(true);
	
	// Cancel any active downloads
	this.app.assman.CancelDownloads();
	
	// Make the search results lose focus, so arrow keys used to scale the
	// inserting model won't also scroll the search results
	this.canvas.focus();
	
	resultElem.siblings().removeClass('selected');
	resultElem.addClass('selected');
	this.app.BeginModelInsertion(resultElem.attr('id'), resultElem.data('metadata'), function() {
	   this.ModelRetrieved(resultElem.attr('id'));
  }.bind(this));
};

SearchController.prototype.ModelRetrieved = function(mid)
{
	this.app.ToggleBusy(false);
};

SearchController.prototype.ResultDeselected = function(mid)
{
	var resultElem = $('#'+mid);
	resultElem.removeClass('selected');
};

SearchController.encodeQueryText = function(text)
{
	// Do a normal encodeURIComponent, but then replace
	// '%20' with '+' so that spaces are handled in the way
	// that Solr expects them.
	text = encodeURIComponent(text);
	text = text.replace(/%20/g, '+');
	return text;
};

SearchController.prototype.DoSearch = function(querytext)
{
	this.results.empty();
	
	// Cancel any active downloads
	this.app.assman.CancelDownloads();
	
	if (querytext == "")
	{
		return;
	}
	
	// Also put up a busy wait icon.
	this.results.append($('<img src="' + Constants.resourceDir + 'busy_wait_big.gif">').addClass('busyWaitIcon'));
  // Seed for search randomization
  var seed = Math.floor((Math.random() * 1000000000) + 1);

  var textQuery = SearchController.encodeQueryText(querytext);
  var solrQuery = textQuery;
  // Boost if text is found in name
  solrQuery = solrQuery + ' name:' + textQuery + '^2';
  // Boost if text is found in category or category0
  var camelQuery = SearchController.encodeQueryText(camelCase(querytext));
  solrQuery = solrQuery + ' category:' + camelQuery + '^4';
  solrQuery = solrQuery + ' category0:' + textQuery + '^4';

	// This is where the search actually happens.
	$.ajax
	({
		type: 'GET',
		url: Constants.searchUrl,
    data:
      {
        'q': solrQuery,
        'wt': 'json',
        'rows': '100',
        // Limit to web scene studio models for now
        'fq': '+source:wss',
        'sort': 'score desc, random_' + seed + " desc",
        'fl': 'name,id,unit,up,front'
      },
		dataType: 'jsonp',	 	// At some point, we might want to switch to a PHP script that queries Solr locally, and then we could use regular JSON again.
		jsonp: 'json.wrf',		// Solr requires the JSONP callback to have this name.
		success: this.SearchSucceeded.bind(this),
		error: this.SearchFailed.bind(this),
		timeout: 10000		// in milliseconds. With JSONP, this is the only way to get the error handler to fire.
	});
};

/**
 'data' is a Solr JSON response object
 **/
SearchController.prototype.SearchSucceeded = function(data, textStatus, jqXHR)
{
	this.PopulateWithResults(data.response.docs);
};

SearchController.prototype.SearchFailed = function(jqXHR, textStatus, errorThrown)
{
	this.results.empty();
	this.results.append
	(
		$('<span>Whoops! There was an error when processing the search request</span>' +
		  '<br/>' +
		  '<span>Error: ' + textStatus + ' ' + errorThrown + '</span>')
	);
};

/**
 'resultList' is a list of objects with 'name' and 'id' properties
 **/
SearchController.prototype.PopulateWithResults = function(resultList)
{
	// First, remove all current search results.
	// also deselect anything currently selected...
	this.results.empty();
	// kill any ongoing insertions
	this.app.insertion_behavior.cancel();
	
	// If there were no search results, notify the user of this
	if (resultList.length == 0)
	{
		this.results.append('<span>No Results</span>');
		return;
	}
	
	// Add all new search results
	var numResults = resultList.length;
	for (var i = 0; i < numResults; i++)
	{
		this.results.append(this.CreateSearchResult(resultList[i]));
	}
};


// Exports
return SearchController;

});
