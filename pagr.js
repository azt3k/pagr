;
(function (root, factory) {

    // AMD. Register as an anonymous module depending on jQuery.
    if (typeof define === 'function' && define.amd) define(['jquery'], factory);

    // Node, CommonJS-like
    else if (typeof exports === 'object') module.exports = factory(require('jquery'));

    // Browser globals (root is window)
    else {
        factory(root.jQuery);
    }

}(this, function ($, undefined) {

    "use strict"

    $(function () {

        var pluginName = "pagr",
            pluginVersion = "0.6.3",
            defaults = {
                bindTo: 'tap click change',
                loadingSelector: 'html',
                loadingClass: 'loading',
                pageLinkSelector: '.page-link',
                disabledClass: 'disabled',
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
                ajaxWait: 0,
                urlHandler: null, // (params, baseUrl)
                requestNotifier: null, // (pagr, requestUrl, params, baseUrl)
                ajaxHandler: null, // (pagr, data, textStatus, jqXHR)
                onInit: null, // (pagr, event) this = the elem that triggered the event
                onBeforePage: null, // (pagr, event) this = the elem that triggered the event
                onAfterPage: null, // (pagr, event) this = the elem that triggered the event
            };

        function Plugin(element, idx, selector, options) {

            var opts = $.extend(true, {}, defaults, options);

            this.$element = $(element);
            this.idx = idx;
            this.settings = opts;
            this.selector = selector || opts.selector; // selector was removed in jq 3.0

            if (!this.selector || this.selector == undefined)
                throw "selector option must be supplied in jQuery 3+"

            this.init();
        }

        Plugin.prototype = {

            init: function () {

                var $elem = this.$element,
                    conf = this.settings,
                    id = $elem.attr('id');

                // add the class!
                $elem.addClass('pagr');

                // ensure we have a uid
                if (!id) {
                    while (!id || $('#' + id).length) {
                        id = Math.floor(Math.random() * 1000) + 1;
                    }
                    $elem.attr('id', id);
                }

                // validate conf
                if (['get', 'post'].indexOf(conf.method) == -1) throw "invalid request method supplied";
                if (['append', 'replace'].indexOf(conf.behaviour) == -1) throw "invalid behaviour supplied";

                // attach the desired behaviour
                this.attachPagination();

                if (!conf.ajax || conf.forceFilter) {
                    this.filter();
                }

            },

            attachPagination: function () {

                var $elem = this.$element,
                    $el,
                    $wrap,
                    self = this,
                    pager,
                    currentPage = $elem.attr('data-page') ? parseInt($elem.attr('data-page')) : 1,
                    conf = this.settings,
                    id = $elem.attr('id');

                // build pager?
                if (conf.pager) {
                    $el = this.getContainer();
                    $wrap = $('#' + id + '-wrap');
                    if ($wrap.length) $wrap.replaceWith(self.buildPager(currentPage));
                    else $el.after(this.buildPager(currentPage));
                }

                // attach
                $(conf.pageLinkSelector).each(function (idx) {

                    var $this = $(this),
                        el = this,
                        evs = $this.attr('data-bind-to') || conf.bindTo,
                        bindTo = evs.split(/[ ]+/).map(function (v) {
                            return v + '.pagr'
                        }).join(' '),
                        currentPage = self.currentPage(),
                        pageJump = $this.attr('data-page') ? $this.attr('data-page') : 1,
                        max = self.getMax(),
                        to = self.parsePageJump(pageJump, currentPage, max);

                    // disable the next button if we've hit the limit
                    // we could prob extend this to also work with last / max (i.e anything other than first or 1)
                    // because often first or one would be used to rest the paging for filtering
                    $this.toggleClass(
                        conf.disabledClass,
                        ((currentPage >= max || max == 0) && pageJump == 'next')
                    );

                    $this
                        .off(bindTo)
                        .on(bindTo, function (e) {

                            // prevent default
                            var allowDefault = $this.attr('data-allow-default');
                            if (allowDefault == undefined || !allowDefault || allowDefault == 'false')
                                e.preventDefault();

                            // do nothing of the item is disabled
                            if ($this.is('.' + conf.disabledClass)) return;

                            // callback
                            if (typeof conf.onBeforePage == 'function')
                                conf.onBeforePage.call(el, self, e);

                            // vars
                            var url = self.baseURL(),
                                currentPage = self.currentPage(),
                                pageJump = $this.attr('data-page') ? $this.attr('data-page') : 1,
                                pageSize = self.pageSize(),
                                sortDirection = self.sortDirection(),
                                sortBy = self.sortBy(),
                                total = self.getTotal(),
                                max = self.getMax(),
                                qs = {},
                                params = {},
                                to,
                                $filterForm,
                                serialised,
                                item,
                                i;

                            if (!$(conf.loadingSelector).is('.' + conf.loadingClass)) {

                                // loading
                                $(conf.loadingSelector).addClass(conf.loadingClass);

                                // target page to load
                                to = self.parsePageJump(pageJump, currentPage, max);

                                // request
                                if (conf.ajax) {

                                    // solves some issues with checkboxes
                                    setTimeout(function () {

                                        var varPage = $elem.attr('data-var-page') || conf.vars.page,
                                            varPageSize = $elem.attr('data-var-page-size') || conf.vars.pageSize,
                                            varSortBy = $elem.attr('data-var-sort-by') || conf.vars.sortBy,
                                            varSortDirection = $elem.attr('data-var-sort-direction') || conf.vars.sortDirection;

                                        // set page size vars
                                        qs[varPage] = to;
                                        qs[varPageSize] = pageSize;
                                        qs[varSortBy] = sortBy;
                                        qs[varSortDirection] = sortDirection;

                                        // extract the data from the filter form
                                        if ($filterForm = self.filterForm()) {
                                            params = $.q2obj($filterForm.serialize());
                                            $.extend(qs, params);
                                        }

                                        // generate the url
                                        var requestUrl = typeof conf.urlHandler == 'function' ?
                                            conf.urlHandler(qs, url) :
                                            $.qs(qs, url);

                                        // request notifier
                                        if (typeof conf.requestNotifier == 'function')
                                            conf.requestNotifier(self, requestUrl, qs, url);

                                        // ajax request
                                        $[conf.method](requestUrl, function (data, textStatus, jqXHR) {

                                            // handle response
                                            if (typeof conf.ajaxHandler == 'function') {
                                                conf.ajaxHandler(self, data, textStatus, jqXHR);
                                            } else {

                                                var newTotal,
                                                    $replacement = $($(data).find(self.selector)[self.idx]),
                                                    newTotal = $replacement.attr('data-total') || 0;

                                                // apply new total if the filter has changed things
                                                $elem.attr('data-total', newTotal);

                                                // append / replace
                                                if (conf.behaviour == 'append' && to != 1) {
                                                    $elem.append($replacement.children());
                                                } else {
                                                    $elem.html('').append($replacement.children());
                                                }
                                            }

                                            // update meta data
                                            $elem.attr('data-page', to);
                                            if (conf.forceFilter) self.filter();
                                            self.attachPagination();

                                            // callback
                                            if (typeof conf.onAfterPage == 'function')
                                                conf.onAfterPage.call(el, self, e);

                                            // loading
                                            $(conf.loadingSelector).removeClass(conf.loadingClass);

                                        });
                                    }, conf.ajaxWait);

                                } else {

                                    //  update meta data
                                    $elem.attr('data-page', to);
                                    self.filter();
                                    self.attachPagination();

                                    // callback
                                    if (typeof conf.onAfterPage == 'function')
                                        conf.onAfterPage.call(el, self, e);

                                    // loading
                                    $(conf.loadingSelector).removeClass(conf.loadingClass);
                                }
                            }

                        });
                });

                // life cycle callback
                if (typeof conf.onInit == 'function')
                    conf.onInit.call($elem[0], this);

            },

            parsePageJump: function (pageJump, currentPage, max) {

                var to;

                switch (pageJump) {

                    case 'first':
                        to = 1;
                        break;

                    case 'next':
                        to = currentPage + 1 > max ? max : currentPage + 1;
                        break;

                    case 'prev':
                        to = currentPage - 1 < 1 ? 1 : currentPage - 1;
                        break;

                    case 'last':
                        to = max;
                        break;

                    default:
                        to = parseInt(pageJump);
                }

                return to;
            },

            getMax: function () {
                return Math.ceil(this.getTotal() / this.pageSize());
            },

            appendedTotal: function () {
                var $elem = this.$element;
                return $elem.children().length;
            },

            getTotal: function () {
                var $elem = this.$element;
                return $elem.attr('data-total') ? parseInt($elem.attr('data-total')) : $elem.children().length;
            },

            currentPage: function () {
                var $elem = this.$element;
                return $elem.attr('data-page') ? parseInt($elem.attr('data-page')) : 1;
            },

            sortBy: function () {
                var $elem = this.$element;
                return $elem.attr('data-sort-by') ? $elem.attr('data-sort-by') : null;
            },

            sortDirection: function () {
                var $elem = this.$element;
                return $elem.attr('data-sort-direction') == 'desc' ? 'desc' : 'asc';
            },

            baseURL: function () {

                var $elem = this.$element,
                    conf = this.settings,
                    val = $elem.attr('data-base-url'),
                    baseURL;

                // see if we have a base url defined on the parent (tablizr)
                if (!val && $elem.parent().is('table')) {
                    val = $elem.parent().attr('data-base-url');
                }

                baseURL = val ? val : conf.baseUrl;

                return baseURL ? baseURL : window.location.href;
            },

            pageSize: function () {
                var $elem = this.$element,
                    conf = this.settings;

                return $elem.attr('data-page-size') ? parseInt($elem.attr('data-page-size')) : conf.pageSize;
            },

            filterForm: function () {
                var $elem = this.$element,
                    conf = this.settings,
                    $fallback = conf.filterFormSelector ? $(conf.filterFormSelector) : null;

                return $elem.attr('data-filter-form') ? $($elem.attr('data-filter-form')) : $fallback;
            },

            getContainer: function () {

                var $el = this.$element;

                while ($el.parent().is('table, tbody, tr')) {
                    $el = $el.parent();
                }

                return $el;
            },

            buildPager: function (currentPage) {

                var cur,
                    i,
                    pager = '',
                    conf = this.settings,
                    $elem = this.$element,
                    id = $elem.attr('id'),
                    total = this.getTotal(),
                    cls = conf.pager.class != undefined && conf.pager.class ? conf.pager.class : 'page-link',
                    max = this.getMax();

                pager = '<div id="' + id + '-wrap" class="pagr-wrap">' +
                    (conf.pager.first ? '<a class="' + cls + (currentPage == 1 ? ' ' + conf.disabledClass : '') + '" data-page="first">First</a>' : '') +
                    (conf.pager.prev ? '<a class="' + cls + (currentPage == 1 ? ' ' + conf.disabledClass : '') + '" data-page="prev">Prev</a>' : '');

                if (conf.pager.range) {
                    for (i = -conf.pager.range; i <= conf.pager.range; i++) {
                        cur = currentPage + i;
                        if (cur > 0 && cur <= max) pager += '<a class="' + cls + (currentPage == cur ? ' current' : '') + '" data-page="' + cur + '">' + cur + '</a>';
                    }
                }

                pager += (conf.pager.next ? '<a class="' + cls + (currentPage == max ? ' ' + conf.disabledClass : '') + '" data-page="next">Next</a>' : '') +
                    (conf.pager.last ? '<a class="' + cls + (currentPage == max ? ' ' + conf.disabledClass : '') + '" data-page="last">Last</a>' : '') +
                    '</div>';

                return pager;
            },

            filter: function () {
                var $elem = this.$element,
                    conf = this.settings,
                    total = this.getTotal(),
                    cur = this.currentPage(),
                    pageSize = this.pageSize();

                if (total > pageSize) {
                    $elem.children().each(function (idx) {
                        var $this = $(this);
                        if (conf.behaviour != 'append') {
                            if (idx >= (pageSize * (cur - 1)) && idx < (pageSize * cur)) $this.show();
                            else $this.hide();
                        } else {
                            if (idx < (pageSize * cur)) $this.show();
                            else $this.hide();
                        }
                    });
                }
            }
        };

        $.q2obj = function (query) {

            if (query == '') return null;

            var hash = {},
                vars = query.split("&");

            for (var i = 0; i < vars.length; i++) {

                var pair = vars[i].split("="),
                    k = decodeURIComponent(pair[0]),
                    v = decodeURIComponent(pair[1]);

                // If it is the first entry with this name
                if (typeof hash[k] === "undefined") {

                    // not end with []. cannot use negative index as IE doesn't understand it
                    if (k.substr(k.length - 2) != '[]') hash[k] = v;
                    else hash[k] = [v];
                }

                // If subsequent entry with this name and not array replace it
                else if (typeof hash[k] === "string") hash[k] = v;

                // If subsequent entry with this name and is array
                else hash[k].push(v);
            }
            return hash;
        }

        $.q = function (key, value, url) {

            if (!url) url = window.location.href;

            var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
                hash;

            if (re.test(url)) {
                if (typeof value !== 'undefined' && value !== null)
                    return url.replace(re, '$1' + key + "=" + value + '$2$3');
                else {
                    hash = url.split('#');
                    url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
                    if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                        url += '#' + hash[1];
                    return url;
                }
            } else {
                if (typeof value !== 'undefined' && value !== null) {
                    var separator = url.indexOf('?') !== -1 ? '&' : '?';
                    hash = url.split('#');
                    url = hash[0] + separator + key + '=' + value;
                    if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                        url += '#' + hash[1];
                    return url;
                } else
                    return url;
            }
        };

        $.qs = function (conf, url, deep) {

            // default merge to false
            deep = deep || false;

            // build all the parts
            var urlBase = url.split('?')[0] || url,
                urlQ = url.split('?')[1] || '',
                urlObj = $.q2obj(urlQ),
                merged = deep ? $.extend(true, {}, urlObj, conf) : $.extend({}, urlObj, conf);

            // return complete url
            return urlBase + '?' + $.param(merged);
        };

        $.fn[pluginName] = function (options) {
            var selector = this.selector;
            return this.each(function (idx) {
                if (!$.data(this, "plugin_" + pluginName)) {
                    $.data(this, "plugin_" + pluginName, new Plugin(this, idx, selector, options));
                }
            });
        };
    });

}));