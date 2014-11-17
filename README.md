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


````json
{
    loadingSelector: 'html',
    pageLinkSelector: '.page-link',
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
    direction: 'asc', // asc / desc
    vars: {
        page: "page",
        pageSize: "page_size"
    },
    baseURL: window.location.href,
    pageSize: 10,
    urlHandler: null,
    ajaxHandler: null,
    onBeforePage: null,
    onAfterPage: null,
}
````

### Todo

- Finish docs
- Make more examples