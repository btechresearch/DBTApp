/// <reference path="jquery-3.1.1.js" />
/// <reference path="azure.js" />
/// <reference path="conversation.js" />

// This object manages the ModelsOfEmotions screen.
function ModelsOfEmotions(element, data) {
    'use strict';

    if (!this instanceof ModelsOfEmotions)
        return new ModelsOfEmotions(element, data);
    var _this = this;

    _this.$root = $('<div>').addClass('modelsofemotions').appendTo(element); // The root element in the HTML
    _this.data = data; // The user's data and responses to questions
    _this.models = {}; // Contains each model in the list.

    // There is no search feature in the design yet.
    //_this.$search = $('<input type="text">').addClass('search').attr('placeholder', "Search for Models").appendTo(_this.$root).on('change keyup', function () {
    //    var search = $(this).val().toLowerCase();
    //    _this.$models.children().each(function () {
    //        var model = _this.models[this.id];
    //        if (!search || ~(model.Title || "Untitled Model").toLowerCase().indexOf(search)) {
    //            $(this).show();
    //        } else {
    //            $(this).hide();
    //        }
    //    });
    //});
    _this.$models = $('<div>').addClass('models').appendTo(_this.$root);
    _this.$conversation = $('<div>').addClass('model-conversation').appendTo(_this.$root).hide();
    _this.conversation = new Conversation(_this.$conversation, _this.data, 'ModelOfEmotions');
    _this.modelParts = {};
    _this.modelBlurbs = {};
    _this.modelContents = {};

    $(_this.conversation).on('loaded', function () {
        _this.conversation.lines.forEach(function (line) {
            if (line.ModelPart) {
                _this.modelParts[line.ID] = line.ModelPart;
            }
            _this.modelBlurbs[line.ID] = line.ModelBlurb || line.Content;
            _this.modelContents[line.ID] = line.Content;
        });
        _this.models.forEach(function (model) {
            updateModelView(model);
        });
    });
    $(_this.conversation).on('line', function (ev, line) {
        if (_this.showingModel) {
            if (!line.Type) {
                _this.showingModel.Highlight = line.ModelPart;
                updateModelView(_this.showingModel);
            }
        }
    });
    $(_this.data).on('change', function (ev, id) {
        if (_this.showingModel) {
            if (id in _this.modelParts) {
                _this.showingModel.values[_this.modelParts[id]] = _this.data.get(id);
                _this.showingModel.hasChanges = true;
            }
            updateModelView(_this.showingModel);
        }
    });
    $(_this.conversation).on('end', function () {
        if (_this.showingModel) {
            location.hash += '/model';
            _this.showingModel.Finished = timeString();
            $(element).trigger('save');
        }
    });

    // Loads all previous models into the list.
    _this.load = function (sas, contentSAS, user) {
        _this.table = azure.getTable(sas);
        _this.conversation.load(contentSAS);
        _this.user = user;

        return _this.table.query(function (rows, error, _, status) {
            if (rows) {
                // Now load the new data.
                rows.reverse().forEach(function (row) {
                    delete row.PartitionKey;
                    delete row.RowKey;
                    delete row.Timestamp;
                    _this.addModel(row);
                });
            } else {
                log("Error loading models of emotions from azure storage:\n" + status + "\n" + (error || {}).responseText);
                throw error;
            }
        }).done(function () {
            _this.loaded = new Date();
            if (Data.logToConsole) {
                console.log("ModelsOfEmotions Loaded on " + _this.loaded);
            }
            $(_this).triggerHandler('loaded');
        });
    }

    // Adds a previously created model to the list.
    _this.addModel = function (model) {
        // Remove any previous item in the list for the model.
        _this.$models.find('#' + model.ID + '.model').parent().remove();

        delete model.IsNew;

        if (!model.Deleted) {
            // Create a spacer at the bottom to make the flex wrapper keep all items the same size.
            var $spacer = $('<div>').addClass('spacer').appendTo(_this.$models);

            // Create a new item in the list.
            var $container = $('<div>').addClass('model-container').insertBefore(_this.$models.children('.spacer').first());

            var $model = generateModelView(model, 'thumbnail').appendTo($container).click(function () {
                if (!showingDeletes) {
                    location.hash += '/' + this.id;
                } else {
                    $selectorInput.prop('checked', !$selectorInput.prop('checked'));
                    $selectorInput.trigger('change');
                }
            });
            var $selector = $('<label>').addClass('model-selector').appendTo($model);
            var $selectorInput = $('<input type="checkbox">').appendTo($selector).change(function () {
                $model.toggleClass('selected', this.checked);
            });
            updateModelView(model);
        }

        _this.models[model.ID] = model;

        return $model;
    }

    // Generates the elements for a model, in either 'full' size, thumbnail form, or regular size.
    function generateModelView(model, size) {
        var $model = $('<div>').addClass('model').addClass(size || 'full').attr('id', model.ID);

        var $row1 = $('<div>').addClass('model-row model-row1').appendTo($model);
        var $emotion = $('<div>').addClass('model-element model-emotion').attr('data-part', 'Emotion').appendTo($row1);

        var $row2 = $('<div>').addClass('model-row model-row2').appendTo($model);
        var $event = $('<div>').addClass('model-element model-event').attr('data-part', 'Event').appendTo($row2);

        var $row3 = $('<div>').addClass('model-row model-row3').appendTo($model);
        var $urges = $('<div>').addClass('model-element model-urges').attr('data-part', 'Urges').appendTo($row3);
        var $changes = $('<div>').addClass('model-element model-changes').attr('data-part', 'Changes').appendTo($row3);

        var $row4 = $('<div>').addClass('model-row model-row4').appendTo($model);
        var $actions = $('<div>').addClass('model-element model-actions').attr('data-part', 'Actions').appendTo($row4);
        var $words = $('<div>').addClass('model-element model-words').attr('data-part', 'Words').appendTo($row4);
        var $sensations = $('<div>').addClass('model-element model-sensations').attr('data-part', 'Sensations').appendTo($row4);

        var $row5 = $('<div>').addClass('model-row model-row5').appendTo($model);
        var $interpretations = $('<div>').addClass('model-element model-interpretations').attr('data-part', 'Interpretations').appendTo($row5);
        var $vulnerabilities = $('<div>').addClass('model-element model-vulnerabilities').attr('data-part', 'Vulnerabilities').appendTo($row5);

        var $row6 = $('<div>').addClass('model-row model-row6').appendTo($model);
        var $effects = $('<div>').addClass('model-element model-effects').attr('data-part', 'Effects').appendTo($row6);

        $model.find('.model-element').append($('<div>').addClass('model-description'));

        $(model).on('change', function () {
            updateModelView(this);
        });

        return $model;
    }

    // Updates the visual model with the latest data/content.
    function updateModelView(model) {
        // Look at values currently being edited if any.
        model = model.values || model;

        var $icons = $('#' + model.ID + '.icon');
        var $thumbnails = $('#' + model.ID + '.thumbnail');
        var $fulls = $('#' + model.ID + '.full');

        $icons.add($fulls).find('.model-element').removeClass('model-highlight');
        if (model.Highlight) {
            $icons.add($fulls).find('.model-' + model.Highlight.toLowerCase()).addClass('model-highlight');
        }

        $thumbnails.find('.model-emotion .model-description').html(getBlurb(model.Emotion));
        $thumbnails.find('.model-event .model-description').text(model.Modified.match(/ (.*)|$/)[1]);

        $fulls.find('.model-emotion .model-description').html(getBlurb(model.Emotion));
        $fulls.find('.model-event .model-description').html(getBlurb(model.Event));
        $fulls.find('.model-urges .model-description').html(getBlurb(model.Urges));
        $fulls.find('.model-changes .model-description').html(getBlurb(model.Changes));
        $fulls.find('.model-actions .model-description').html(getBlurb(model.Actions));
        $fulls.find('.model-words .model-description').html(getBlurb(model.Words));
        $fulls.find('.model-sensations .model-description').html(getBlurb(model.Sensations));
        $fulls.find('.model-interpretations .model-description').html(getBlurb(model.Interpretations));
        $fulls.find('.model-vulnerabilities .model-description').html(getBlurb(model.Vulnerabilities));
        $fulls.find('.model-effects .model-description').html(getBlurb(model.Effects));
    }

    function getBlurb(ids) {
        return ids && ids.split(/,/g).map(function (id) {
            return _this.modelBlurbs[id] || id;
        }).join(', ').replace(/\.,/g, ',');
    }

    function getContent(ids) {
        return ids && ids.split(/,/g).map(function (id) {
            return '"' + (_this.modelContents[id] || id) + '"';
        }).join(', ').replace(/\.,/g, ',').replace(/\, "(?!.*, ")/, ' and "');
    }

    // Creates a new model, with an optional initial title, and opens it.
    _this.createModel = function () {
        var time = new Date();
        var model = {
            ID: +time,
            Created: timeString(time),
            Modified: timeString(time),
            IsNew: true
        };

        _this.models[model.ID] = model;
        location.hash += '/' + model.ID;
    }

    _this.openModel = function (model) {
        if (_this.showingModel != model) {
            if (_this.showingModel) {
                _this.closeModel();
            }

            model.values = Object.create(model); // Contains the current values being shown on the screen (but not saved to the actual model yet).

            // Generate the full model.
            var $editor = $('<div>').addClass('model-editor').attr('id', model.ID + 'editor').appendTo(_this.$root);
            //var $title = $('<input type="text">').addClass('model-title').attr('placeholder', "Untitled Model").val(model.Title).appendTo($editor);
            var $date = $('<div>').addClass('model-date').text(model.Modified).appendTo($editor);
            var $model = generateModelView(model, 'full').appendTo($editor).on('click', function (e) {
                var part = $(e.target).closest('[data-part]').data('part');
                $(window).trigger('contextChanged', ['ModelOfEmotions' + part, {
                    model: model.values,
                    getBlurb: getBlurb,
                    getContent: getContent
                }, true]);
            });

            _this.$models.hide();
            $('#mainFooter').removeClass('showNew showDelete');

            _this.showingModel = model;
            updateModelView(model);
        }
        $(window).trigger('contextChanged', ['ModelOfEmotionsModel', {
            model: _this.showingModel.values,
            getBlurb: getBlurb,
            getContent: getContent
        }]);
        return _this.showingModel;
    };

    _this.showInterview = function () {
        if (_this.showingModel) {
            _this.$conversation.show();
            _this.conversation.start();
            _this.$root.find('.model-editor').hide('fade');
            if ($('#mainFooter').find('.model.icon').length == 0) {
                var $icon = generateModelView(_this.showingModel, 'icon').insertAfter('#navBack').on('click', function () {
                    location.hash += '/model';
                });
            } else {
                $('#mainFooter').find('.model.icon').show();
            }
            $('#mainFooter').addClass('showSave');
            $(window).trigger('contextChanged', ['ModelOfEmotionsInterview', {
                model: _this.showingModel.values,
                getBlurb: getBlurb,
                getContent: getContent
            }]);
        } else {
            alert("Can't show interview because no model has been selected.");
        }
    };

    _this.hideInterview = function () {
        //_this.$conversation.hide(); // This makes it so when the conversation is shown again then all the animations re-run which looks weird.
        _this.conversation.stop();
        $('#mainFooter').find('.model.icon').hide();
        _this.$root.find('.model-editor').show('fade');
        $('#mainFooter').removeClass('showSave');
    };

    _this.closeModel = function () {
        _this.$models.show();
        _this.$root.children('.model-editor').remove(); // Close the editor.
        _this.$conversation.hide();
        _this.conversation.reset();

        $('#mainFooter').find('.model.icon').remove(); // Remove any corresponding icons.
        $('#mainFooter').removeClass('showSave');
        $('#mainFooter').addClass('showDelete');
        if (!showingDeletes) {
            $('#mainFooter').addClass('showNew');
        }

        if (_this.showingModel) {
            delete _this.showingModel.hasChanges;
            delete _this.showingModel.values;
            updateModelView(_this.showingModel);
            _this.showingModel = null;
        }

        $(window).trigger('contextChanged', 'ModelOfEmotions');
    }

    $(element).on('showing', function () {
        if (!_this.showingModel) {
            $('#mainFooter').addClass('showDelete');
            if (!showingDeletes) {
                $('#mainFooter').addClass('showNew');
            }
        }
    });

    $(element).on('hiding', function () {
        $('#mainFooter').find('.model.icon').hide();
    });

    var showingDeletes = false;

    function showDeletes() {
        if (!showingDeletes) {
            _this.$models.addClass('showDelete');
            $('#mainFooter').removeClass('showNew');
            showingDeletes = true;
        }
    }

    function hideDeletes() {
        if (showingDeletes) {
            _this.$models.find('.model-selector input').prop('checked', false); // Uncheck all the boxes.
            _this.$models.find('.model-selector input').change(); // Let event handlers see that the boxes have been unchecked.
            _this.$models.removeClass('showDelete'); // Hide the selectors
            $('#mainFooter').addClass('showNew'); // Put the New button back.
            showingDeletes = false;
        }
    }

    function deleteSelected() {
        _this.$models.find('.model.selected').each(function () {
            var $model = $(this);
            var model = _this.models[this.id];
            model.Deleted = timeString();
            azure.writeData(_this.table, _this.user, model, function done(result, status, response, error) {
                if (error != undefined) {
                    if (confirm("Unable to delete Model of Emotions " + model.ID + ": " + status + " " + error + ". \nPress OK to retry, or Cancel to ignore.")) {
                        azure.writeData(_this.table, _this.user, model, done);
                    }
                } else {
                    $model.parent().remove();
                }
            });
        });
    }

    $(element).on('delete', function () {
        if (!showingDeletes) {
            showDeletes();
            history.pushState('delete', null, null);
        } else {
            deleteSelected();
            history.back(); // This will remove the UI.
        }
    });

    $(element).on('new', function () {
        _this.createModel();
    });

    $(element).on('save', function () {
        var model = _this.showingModel;
        if (model && model.hasChanges) {
            model.Modified = timeString();
            $.extend(model, model.values);
            delete model.values;
            delete model.hasChanges;
            azure.writeData(_this.table, _this.user, model, function done(result, status, response, error) {
                if (error != undefined) {
                    if (confirm("Unable to save Model of Emotions: " + status + " " + error + ". \nPress OK to retry, or Cancel to ignore.")) {
                        azure.writeData(_this.table, _this.user, model, done);
                    } else {
                        history.back();
                    }
                } else {
                    if (model.IsNew) {
                        data.set('ModelOfEmotions', model.ID);
                        if (settings['ModelOfEmotionsSavePoints'] > 0) {
                            score(settings['ModelOfEmotionsSavePoints'], 'ModelOfEmotions');
                        }
                    }
                    _this.addModel(model);
                    history.back();
                }
            });
        } else {
            history.back();
        }
    });

    $(element).on('route', function (ev, path) {
        var model = path.match(/\/?([^\/]*)/)[1];
        if (model && model != 'delete') {
            if (_this.loaded) {
                if (_this.models[model]) {
                    _this.openModel(_this.models[model]);

                    // Check to see if we need to show the interview.
                    if (path.match(/\/interview$/) || (!_this.models[model].Finished && !path.match(/model$/))) {
                        _this.showInterview();
                    } else {
                        _this.hideInterview();
                    }
                } else {
                    alert('Unknown model of emotion: ' + model);
                    location.hash = location.hash.split('/')[0];
                }
            } else {
                $(_this).one('loaded', route.bind(this, ev, path));
            }
        } else {
            _this.closeModel();
            if (model == 'delete') {
                showDeletes();
            } else {
                hideDeletes();
            }
        }
    });

    function timeString(time) {
        time = time || new Date();
        return time.toLocaleDateString() + " " + time.toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric' });
    }
}
