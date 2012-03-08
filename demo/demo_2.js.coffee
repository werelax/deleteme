# Tag Input: take 2
#
# Event Map:
#  - TagAccumulator: in = [delete-last, store], out = []
#  - TagSuggest: in = [suggest, go-up, go-down, select-suggestion, cancel-selection], out = [selected]

# Channel definition (pub/sub)

class Channel
  subscribe: (type, fn, ctx) ->
    @events[type] ||= []
    @events[type].push({context: ctx, callback: fn || this})
  unsubscribe: (chn, fn) ->
    # pending
  publish: (type, args...) ->
    console.log 'published: ' + type
    unless @events[type] then return false
    for subscriber in @events[type]
      subscriber.callback.apply(subscriber.context, args)
  constructor: ->
    @events = {}

# Store and manage the accumulated tags

class TagAcumulator
  constructor: (ch) ->
    @channel = ch
    @channel.subscribe 'store', @store, @
    @channel.subscribe 'delete-last', @delete_last, @
    @stored_tags = []
    @dom = @initialize_dom()
    @bind_events(@dom)

  initialize_dom: ->
    tag_list: $('#demo2-tag-list')

  bind_events: (dom) ->
    self = @
    dom.tag_list.delegate 'li.e-tag > a', 'click', (e) ->
      tag_element = $(this).closest('li.e-tag')
      self.stored_tags = _.without self.stored_tags, tag_element.attr('data-tag')
      tag_element.remove()

  render: (tag) ->
    $('<li/>')
      .addClass('e-tag')
      .attr('data-tag', tag)
      .text(tag)
      .append('<a href="#">x</a>')

  store: (tag) ->
    @stored_tags.push tag
    @dom.tag_list.append @render(tag)

  delete_last: ->
    deleted = @stored_tags.pop()
    @dom.tag_list.find("[data-tag=#{deleted}]").remove()

# Show and manage the suggestion box

class TagSuggestion
  constructor: (ch) ->
    @channel = ch
    @channel.subscribe 'suggest', @suggest, @
    @channel.subscribe 'end-suggest', @close_box, @
    @channel.subscribe 'go-down', @go_down, @
    @channel.subscribe 'go-up', @go_up, @
    @channel.subscribe 'select-suggestion', @select_suggestion, @
    @channel.subscribe 'cancel-selection', @cancel_selection, @
    @input = null
    @selected_index = 0
    @box_active = false
    @suggestion_list = ["hola", "hello", "ahoy!", "bonjorno", "halo", "buenas", "akandemorl", "jarl"]
    @active_suggestion_list = []
    @dom = @initialize_dom()
    @bind_events(@dom)

  initialize_dom: ->
    suggestion_box: $('#demo2-suggestion-box')

  bind_events: (dom) ->
    self = @
    dom.suggestion_box.delegate 'li.e-suggestion', 'click', ->
      suggestion = $(this).attr('data-suggestion')
      self.channel.publish('selected', suggestion)

  suggest: (input) ->
    # Don't do anything if the input is the same
    if @input != input
      @input = input
      return @dom.suggestion_box.slideUp() if input.length == 0
      @active_suggestion_list = _.filter @suggestion_list, (w) -> w.match(input)
      if @active_suggestion_list.length > 0
        @dom.suggestion_box.html('')
        for s in @active_suggestion_list
          @dom.suggestion_box.append @render(s)
        @dom.suggestion_box.slideDown()
        @selected_index = -1
      else
        @dom.suggestion_box.slideUp()

  render: (s) ->
    $('<li/>')
      .addClass('e-suggestion')
      .attr('data-suggestion', s)
      .text(s)

  close_box: ->
    @dom.suggestion_box.hide()

  go_down: ->
    # increase the selection_index and highlight

  go_up: ->
    # decrease the selection index and highlight

  highlight_element: (n) ->

  select_suggestion: ->
    # select currently highlighted suggestion

  cancel_selection: ->
    # suspend the motion/selection events

# Widget parent class

class TagInput
  constructor: ->
    @channel = new Channel()
    @accumulator = new TagAcumulator(@channel)
    @suggest = new TagSuggestion(@channel)
    @channel.subscribe 'selected', @selected_suggestion, @
    @dom = @initialize_dom()
    @bind_events(@dom)

  initialize_dom: ->
      input: $('#demo2-input')

  bind_events: (dom) ->
    self = @
    dom.input.keyup (e) ->
      switch e.keyCode
        when 40     then self.channel.publish('go-down')
        when 38     then self.channel.publish('go-up')
        when 32,188 then e.preventDefault(); self.read_input()
        when 13     then self.channel.publish('select-suggestion')
        when 8      then self.channel.publish('delete-last')
        when 27     then self.channel.publish('cancel-selection')
      self.channel.publish('suggest', self.dom.input.val())

  read_input: (input) ->
    value = input || @dom.input.val()
    value = value.trim().replace(/\W/g, '')
    @channel.publish('store', value) unless value.length <= 0
    @channel.publish('end-suggest')
    @dom.input.val('')

  selected_suggestion: (suggestion) ->
    @read_input(suggestion)

$ ->
  window.tag_input = new TagInput()
