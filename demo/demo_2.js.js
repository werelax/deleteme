(function() {
  var Channel, TagAcumulator, TagInput, TagSuggestion;
  var __slice = Array.prototype.slice;
  Channel = (function() {
    Channel.prototype.subscribe = function(type, fn, ctx) {
      var _base;
      (_base = this.events)[type] || (_base[type] = []);
      return this.events[type].push({
        context: ctx,
        callback: fn || this
      });
    };
    Channel.prototype.unsubscribe = function(chn, fn) {};
    Channel.prototype.publish = function() {
      var args, subscriber, type, _i, _len, _ref, _results;
      type = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      console.log('published: ' + type);
      if (!this.events[type]) {
        return false;
      }
      _ref = this.events[type];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subscriber = _ref[_i];
        _results.push(subscriber.callback.apply(subscriber.context, args));
      }
      return _results;
    };
    function Channel() {
      this.events = {};
    }
    return Channel;
  })();
  TagAcumulator = (function() {
    function TagAcumulator(ch) {
      this.channel = ch;
      this.channel.subscribe('store', this.store, this);
      this.channel.subscribe('delete-last', this.delete_last, this);
      this.stored_tags = [];
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagAcumulator.prototype.initialize_dom = function() {
      return {
        tag_list: $('#demo2-tag-list')
      };
    };
    TagAcumulator.prototype.bind_events = function(dom) {
      var self;
      self = this;
      return dom.tag_list.delegate('li.e-tag > a', 'click', function(e) {
        var tag_element;
        tag_element = $(this).closest('li.e-tag');
        self.stored_tags = _.without(self.stored_tags, tag_element.attr('data-tag'));
        return tag_element.remove();
      });
    };
    TagAcumulator.prototype.render = function(tag) {
      return $('<li/>').addClass('e-tag').attr('data-tag', tag).text(tag).append('<a href="#">x</a>');
    };
    TagAcumulator.prototype.store = function(tag) {
      this.stored_tags.push(tag);
      return this.dom.tag_list.append(this.render(tag));
    };
    TagAcumulator.prototype.delete_last = function() {
      var deleted;
      deleted = this.stored_tags.pop();
      return this.dom.tag_list.find("[data-tag=" + deleted + "]").remove();
    };
    return TagAcumulator;
  })();
  TagSuggestion = (function() {
    function TagSuggestion(ch) {
      this.channel = ch;
      this.channel.subscribe('suggest', this.suggest, this);
      this.channel.subscribe('end-suggest', this.close_box, this);
      this.channel.subscribe('go-down', this.go_down, this);
      this.channel.subscribe('go-up', this.go_up, this);
      this.channel.subscribe('select-suggestion', this.select_suggestion, this);
      this.channel.subscribe('cancel-selection', this.cancel_selection, this);
      this.input = null;
      this.selected_index = 0;
      this.box_active = false;
      this.suggestion_list = ["hola", "hello", "ahoy!", "bonjorno", "halo", "buenas", "akandemorl", "jarl"];
      this.active_suggestion_list = [];
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagSuggestion.prototype.initialize_dom = function() {
      return {
        suggestion_box: $('#demo2-suggestion-box')
      };
    };
    TagSuggestion.prototype.bind_events = function(dom) {
      var self;
      self = this;
      return dom.suggestion_box.delegate('li.e-suggestion', 'click', function() {
        var suggestion;
        suggestion = $(this).attr('data-suggestion');
        return self.channel.publish('selected', suggestion);
      });
    };
    TagSuggestion.prototype.suggest = function(input) {
      var s, _i, _len, _ref;
      if (this.input !== input) {
        this.input = input;
        if (input.length === 0) {
          return this.dom.suggestion_box.slideUp();
        }
        this.active_suggestion_list = _.filter(this.suggestion_list, function(w) {
          return w.match(input);
        });
        if (this.active_suggestion_list.length > 0) {
          this.dom.suggestion_box.html('');
          _ref = this.active_suggestion_list;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            s = _ref[_i];
            this.dom.suggestion_box.append(this.render(s));
          }
          this.dom.suggestion_box.slideDown();
          return this.selected_index = -1;
        } else {
          return this.dom.suggestion_box.slideUp();
        }
      }
    };
    TagSuggestion.prototype.render = function(s) {
      return $('<li/>').addClass('e-suggestion').attr('data-suggestion', s).text(s);
    };
    TagSuggestion.prototype.close_box = function() {
      return this.dom.suggestion_box.hide();
    };
    TagSuggestion.prototype.go_down = function() {};
    TagSuggestion.prototype.go_up = function() {};
    TagSuggestion.prototype.highlight_element = function(n) {};
    TagSuggestion.prototype.select_suggestion = function() {};
    TagSuggestion.prototype.cancel_selection = function() {};
    return TagSuggestion;
  })();
  TagInput = (function() {
    function TagInput() {
      this.channel = new Channel();
      this.accumulator = new TagAcumulator(this.channel);
      this.suggest = new TagSuggestion(this.channel);
      this.channel.subscribe('selected', this.selected_suggestion, this);
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagInput.prototype.initialize_dom = function() {
      return {
        input: $('#demo2-input')
      };
    };
    TagInput.prototype.bind_events = function(dom) {
      var self;
      self = this;
      return dom.input.keyup(function(e) {
        switch (e.keyCode) {
          case 40:
            self.channel.publish('go-down');
            break;
          case 38:
            self.channel.publish('go-up');
            break;
          case 32:
          case 188:
            e.preventDefault();
            self.read_input();
            break;
          case 13:
            self.channel.publish('select-suggestion');
            break;
          case 8:
            self.channel.publish('delete-last');
            break;
          case 27:
            self.channel.publish('cancel-selection');
        }
        return self.channel.publish('suggest', self.dom.input.val());
      });
    };
    TagInput.prototype.read_input = function(input) {
      var value;
      value = input || this.dom.input.val();
      value = value.trim().replace(/\W/g, '');
      if (!(value.length <= 0)) {
        this.channel.publish('store', value);
      }
      this.channel.publish('end-suggest');
      return this.dom.input.val('');
    };
    TagInput.prototype.selected_suggestion = function(suggestion) {
      return this.read_input(suggestion);
    };
    return TagInput;
  })();
  $(function() {
    return window.tag_input = new TagInput();
  });
}).call(this);
