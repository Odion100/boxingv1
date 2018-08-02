//what do i have left to complete on each section of the a
/*
---------------------------frontend---------------------
-general view features
	-save table state feature-
	-fix table resizing
	-refine sys message feature
	-links for making trouble shooting easy-
-orders view-
	-cancel order lines
	-reports-
		?

-receipts view-
	-add order tracking data-
-ActiveWork view-
	-create, edit and delete jobs (
		-search edit and delete jobs
		-job edit form
		-when user selects a job in the job editing form the table will filter by job#
	)
	-job manager frm-(
		-extra eaches can't be put on the job (because how would they ever complete the job)
		-items of the same order line display as one
		-table should be sorted by vendor_code + fulfillment_center
		-search edit and delete jobs
		-job printout	
	)
	
	_veiws_(
		dircetBoxing tbl
		jobs tbl 
		(maybe this should just be a filter)
	)

	_printOuts_(
		-pick sheet printout-
		-consolidated pick sheet-
			-needs to show the total of items you need and locations-
			(example from motty in notes)
	)
	
	-pause all Work feature
		-show user message in place of all orders-
		-undoing pause all work shouldn't effect the specific order line pausing-
	-pause specific order line feature-	
		-this would hide the line from boxing-
		-show user a message in its place-

-boxes view-
	-define boxes table
	-close Session
	-send boxes to abe
-products view-
	-asin table-
		-add edit & delete asins
	-pf sku table-
		-add sku

-directboxing view
	-rewrite using $$tbl & ng-tasks
	-rewrite to work with new system
	-indicate canceled units from jobs(maybe a link to filter and select line in orders view)-
	-open plus close sessions-
	-print the contents of box/sessions as a list- (that may be attached to pallets and boxes)
	-if original upc was not scan when searching the item lables are required
	-add upcs to pf skus on the fly-
		-search pf skus by title-
	-session logic-(
		-sessions are divided by the unique combination of vender_code and fulfillment_center (i.e., items with the same vendor_code and fulfillment_center can be shipped together)
		-sessions are closed manually by motty
		session id is a concatanation of vender_code + '-' + fulfillment_center + '-' + sesson_count
		session_count consists of a count of the week plus a count session converted to alpha character 
		(i.e. 01A = week one session one ) 
	)
	_creating boxes_(
		-track who picked what-
			-add user info to each boxes when it's created-
			-create log in to for each user-
	)
	-reuse empty boxes-
	_two users can't work on the same box_(
		-once a box is created by a certain user use the user info to ensure that 
		only that user can pick that box
	)

-asinData-
	_search multiple upcs_(
		-you have to have the amazon_upc and additional_upcs-
		-searching all upcs when searching-
		-uses amazon upc on labels, etc.-
	)
-pfskudata-
	-search by title
	-i[c te,[;ate]]

-pfsku in db- (main purpose is to store upcs)
	-fields to rememgber
		-primary upc
		-case upc
		-extra upcs
		-pf set unit breakdown
		-title
	-refresh pf sku for new skus-
		-make sure to overwrite titles when refreshing-

-fixes	
	- new asins added when importing edits
	- selection not reset when refreshing orders (maybe i want to create an array to hold selection in $$tbl)
	- eaches & order tracking filters and sorting
	-sys note unallocated received qty
	-side menu should resize to split width with table

*/

/*
---------------------------background process---------------------
-

*/