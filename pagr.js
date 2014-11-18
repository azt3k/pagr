/**
 * Made awesome by AzT3k.
 */

;(function($, window, document, undefined) {

    "use strict";

    var pluginName = "pagr",
        pluginVersion = "0.1.3",
        defaults = {
            loadingSelector: 'html',
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
            ajaxHandler: null,
            onBeforePage: null,
            onAfterPage: null,
        };

    function Plugin(element, idx, selector, options) {
        this.$element = $(element);
        this.idx = idx;
        this.selector = selector;
        this.settings = $.extend(true, {}, defaults, options);
        this.init();
    }

    Plugin.prototype = {

        init: function() {

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
            if (['get','post'].indexOf(conf.method) == -1) throw "invalid request method supplied";
            if (['append','replace'].indexOf(conf.behaviour) == -1) throw "invalid behaviour supplied";

            // attach the desired behaviour
            this.attachPagination();

            if (!conf.ajax || conf.forceFilter) {
                this.filter();
            }

        },

        attachPagination: function() {

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
            $(conf.pageLinkSelector).each(function(idx) {

                var $this = $(this);

                $this.off('tap.pagr').off('click.pagr').on('tap.pagr, click.pagr', function(e) {

                    // prevent default
                    e.preventDefault();

                    // do nothing of the item is disabled
                    if ($this.is('.disabled')) return;

                    // callback
                    if (typeof conf.onBeforePage == 'function') conf.onBeforePage(self);

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
                        to,
                        $filterForm,
                        serialised,
                        item,
                        i;

                    if (!$(conf.loadingSelector).is('.loading')) {

                        // loading
                        $(conf.loadingSelector).addClass('loading');

                        // target page to load
                        switch(pageJump) {

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

                        // request
                        if (conf.ajax) {

                            // set page size vars
                            qs[conf.vars.page] = to;
                            qs[conf.vars.pageSize] = pageSize;
                            qs[conf.vars.sortBy] = sortBy;
                            qs[conf.vars.sortDirection] = sortDirection;

                            // extract the data from the filter form
                            if ($filterForm = self.filterForm()) {
                                serialised = $filterForm.serialize().split('&');
                                for(i=0; i<serialised.length; i++) {
                                    item = serialised[i].split('=');
                                    qs[item[0]] = item[1];
                                }
                            }

                            // generate the url
                            url = typeof conf.urlHandler == 'function' ? conf.urlHandler(qs, url) : $.qs(qs, url);

                            $[conf.method](url, function(data, textStatus, jqXHR) {

                                // handle response
                                if (typeof conf.ajaxHandler == 'function') {
                                    conf.ajaxHandler(data, textStatus, jqXHR);
                                }
                                else {
                                    var $replacement = $($(data).find(self.selector)[self.idx]);
                                    if (conf.behaviour == 'append') {
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
                                if (typeof conf.onAfterPage == 'function') conf.onAfterPage(self);

                                // loading
                                $(conf.loadingSelector).removeClass('loading');

                            });
                        } else {

                            //  update meta data
                            $elem.attr('data-page', to);
                            self.filter();
                            self.attachPagination();

                            // callback
                            if (typeof conf.onAfterPage == 'function') conf.onAfterPage(self);

                            // loading
                            $(conf.loadingSelector).removeClass('loading');
                        }
                    }

                });
            });

        },

        getMax: function() {
            return Math.ceil(this.getTotal() / this.pageSize());
        },

        appendedTotal: function() {
            var $elem = this.$element;
            return $elem.children().length;
        },

        getTotal: function() {
            var $elem = this.$element;
            return $elem.attr('data-total') ? parseInt($elem.attr('data-total')) : $elem.children().length;
        },

        currentPage: function() {
            var $elem = this.$element;
            return $elem.attr('data-page') ? parseInt($elem.attr('data-page')) : 1;
        },

        sortBy: function() {
            var $elem = this.$element;
            return $elem.attr('data-sort-by') ? $elem.attr('data-sort-by') : null;
        },

        sortDirection: function() {
            var $elem = this.$element;
            return $elem.attr('data-sort-direction') == 'desc' ? 'desc' : 'asc';
        },

        baseURL: function() {

            var $elem = this.$element,
                conf = this.settings,
                val = $elem.attr('data-base-url');

            // see if we have a base url defined on the parent (tablizr)
            if (!val && $elem.parent().is('table')) {
                val = $elem.parent().attr('data-base-url');
            }

            return val ? val : conf.baseUrl;
        },

        pageSize: function() {
            var $elem = this.$element,
                conf = this.settings;

            return $elem.attr('data-page-size') ? parseInt($elem.attr('data-page-size')) : conf.pageSize;
        },

        filterForm: function() {
            var $elem = this.$element,
                conf = this.settings,
                $fallback = conf.filterFormSelector ? $(conf.filterFormSelector) : null;

            return $elem.attr('data-filter-form') ? $($elem.attr('data-filter-form')) : $fallback;
        },

        getContainer: function() {

            var $el = this.$element;

            while ($el.parent().is('table, tbody, tr')) {
                $el = $el.parent();
            }

            return $el;
        },

        buildPager: function(currentPage) {

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
                    (conf.pager.first ? '<a class="' + cls + (currentPage == 1 ? ' disabled' : '') + '" data-page="first">First</a>' : '') +
                    (conf.pager.prev  ? '<a class="' + cls + (currentPage == 1 ? ' disabled' : '') + '" data-page="prev">Prev</a>' : '');

            if (conf.pager.range) {
                for (i = -conf.pager.range; i <= conf.pager.range; i++) {
                    cur = currentPage + i;
                    if (cur > 0 && cur <= max) pager += '<a class="' + cls + (currentPage == cur ? ' current' : '') +'" data-page="' + cur +'">' + cur + '</a>';
                }
            }

            pager+= (conf.pager.next ? '<a class="' + cls + (currentPage == max ? ' disabled' : '') + '" data-page="next">Next</a>' : '') +
                    (conf.pager.last ? '<a class="' + cls + (currentPage == max ? ' disabled' : '') + '" data-page="last">Last</a>' : '') +
                    '</div>';

            return pager;
        },

        filter: function() {
            var $elem = this.$element,
                conf = this.settings,
                total = this.getTotal(),
                cur = this.currentPage(),
                pageSize = this.pageSize();

            if (total > pageSize) {
                $elem.children().each(function(idx) {
                    var $this = $(this);
                    if (conf.behaviour != 'append') {
                        if (idx >= (pageSize * (cur -1)) && idx < (pageSize * cur)) $this.show();
                        else $this.hide();
                    } else {
                        if (idx < (pageSize * cur)) $this.show();
                        else $this.hide();
                    }
                });
            }
        }
    };

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
        }
        else {
            if (typeof value !== 'undefined' && value !== null) {
                var separator = url.indexOf('?') !== -1 ? '&' : '?';
                hash = url.split('#');
                url = hash[0] + separator + key + '=' + value;
                if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                    url += '#' + hash[1];
                return url;
            }
            else
                return url;
        }
    }

    $.qs = function (conf, url) {
        for (var i in conf) {
            url = $.q(i, conf[i], url);
        }
        return url;
    }

    $.fn[pluginName] = function(options) {
        var selector = this.selector;
        return this.each(function(idx) {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, idx, selector, options));
            }
        });
    };

})(jQuery, window, document);


