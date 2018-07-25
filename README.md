pagr
========

A client site / ajax (backend agnostic) pagination system

### Basic Usage

````html
<div>
    <div id="container" data-size="3">
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
    </div>
</div>
````

````javascript
$('#container').pagr();
````


### Options / Defaults


````js
{
    loadingSelector: 'html',
    loadingClass: 'loading',
    pageLinkSelector: '.page-link',
    filterFormSelector: null,
    pager: {
        class: 'page-link',
        next: true,
        prev: true,
        range: 3,
        first: true,
        last: true
    },
    forceFilter: false,
    ajax: false,
    method: 'get', // get / post
    behaviour: 'replace', // append / replace
    vars: {
        sortDirection: 'direction',
        sortBy: 'sort',
        page: 'page',
        pageSize: 'page_size'
    },
    baseURL: window.location.href,
    pageSize: 10,
    urlHandler: null,
    ajaxHandler: null,  // signature: (pagr, data, textStatus, jqXHR)
    onBeforePage: null, // signature: (pagr)
    onAfterPage: null,  // signature: (pagr)
}
````

### Todo

- Finish docs
- Make more examples