var _ = require('lodash');
var moment = require('../public/js/libs/moment/moment');
/**
 *  Represents a Filter Mapper constructor.
 *  Allow __You__ post `filter` generated by UI & then retrieve `filterObject` for mongoose.
 * @constructor
 */

var FilterMapper = function () {
    var FILTER_CONSTANTS = require('../public/js/constants/filters');
    var startDate;
    var endDate;

    function convertType(values, type, operator) {
        var result = {};
        var _operator = operator || '$in';

        switch (type) {
            case 'ObjectId':
                if (values.indexOf('None') !== -1) {
                    values.push(null);
                }
                result[_operator] = values.objectID();
                break;
            case 'string':
                if (values.indexOf('None') !== -1) {
                    values.push('');
                    values.push(null);
                }

                result[_operator] = values;
                break;
            case 'date':
                if (!Array.isArray(_operator)) {
                    _operator = [_operator];
                }

                if (values[0]) {
                    startDate = moment(new Date(values[0])).startOf('day');
                    result[_operator[0]] = new Date(startDate);
                }

                if (values[1]) {
                    endDate = moment(new Date(values[1])).endOf('day');
                    result[_operator[1] || _operator[0]] = new Date(endDate);
                }

                break;
            case 'integer':
                result[_operator] = _.map(values, function (element) {
                    return parseInt(element, 10);
                });
                break;
            case 'boolean':
                result[_operator] = _.map(values, function (element) {
                    return element === 'true';
                });
                break;
            case 'letter':
                result = new RegExp('^[' + values.toLowerCase() + values.toUpperCase() + '].*');
                break;
        }

        return result;
    }

    /**
     * @param {Object} filter Filter generated by UI.
     * @param {Object} filter.* Keys are model fields.
     * @param {String} filter.*.type Type of filter values.
     * @param {Array} filter.*.values Array of filter values.
     * @return {Object} Returns query object.
     */

    this.mapFilter = function (filter, options) {
        var filterNames = Object.keys(filter);
        var contentType = options.contentType;
        var fieldsArray = options.keysArray;
        var withoutState = options.withoutState;
        var andState = options.andState;
        var suffix = options.suffix;
        var filterResObject = {};
        var filterValues;
        var filterType;
        var filterBackend;
        var filterConstants = FILTER_CONSTANTS[contentType] || {};
        var filterConstantsByName;
        var filterObject;
        var filterName;
        var key;
        var i;

        var $orArray;

        if (fieldsArray && Array.isArray(fieldsArray)) {
            filterNames = withoutState ? _.difference(filterNames, fieldsArray) : fieldsArray;
        }

        for (i = filterNames.length - 1; i >= 0; i--) {
            filterName = filterNames[i];
            if (filterNames.indexOf(filterName) !== -1) {
                filterObject = filter[filterName];
                filterValues = filterObject.value || [];
                filterConstantsByName = filterConstants[filterName] || {};
                filterType = !!filterObject.type ? filterObject.type : filterConstantsByName.type || 'ObjectId';
                filterBackend = filterConstantsByName.backend || filterObject.key || filterObject.backend;

                if ((contentType === 'GoodsOutNote' || contentType === 'stockTransactions') && filterBackend === 'status') {
                    filterValues.forEach(function (el) {
                        filterResObject[filterBackend + '.' + el] = true;
                    });
                } else if (contentType === 'Products' && filterBackend === 'job') {
                    filterResObject.job = {$exists: false};
                } else if (filterValues && (filterName !== 'startDate' || filterName !== 'endDate')) {
                    if (filterBackend) {
                        if (typeof filterBackend === 'string') {
                            key = suffix ? filterBackend + '.' + suffix : filterBackend;
                            filterResObject[key] = convertType(filterValues, filterType);
                        } else {
                            if (!Array.isArray(filterBackend)) {
                                filterBackend = [filterBackend];
                            }

                            $orArray = [];

                            _.map(filterBackend, function (keysObject) {
                                var resObj = andState ? filterResObject : {};

                                resObj[keysObject.key] = convertType(filterValues, filterType, keysObject.operator);

                                if (!andState) {
                                    $orArray.push(resObj);
                                }
                            });

                            if (!andState) {
                                if (!filterResObject.$and) {
                                    filterResObject.$and = [];
                                }

                                filterResObject.$and.push({$or: $orArray});
                            }
                        }
                    }
                }
            }
        }

        return filterResObject;
    };

};

module.exports = FilterMapper;
