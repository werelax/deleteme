## Tag Input Widget: Take 2

# Channel definition (pub/sub)

class Channel
  subscribe: (type, fn, ctx) ->
    @events[type] ||= []
    @events[type].push({context: ctx, callback: fn || this})
  unsubscribe: (chn, fn) ->
    # pending
  publish: (type, args...) ->
    unless @events[type] then return false
    for subscriber in @events[type]
      subscriber.callback.apply(subscriber.context, args)
  constructor: ->
    @events = {}

# Store and manage the accumulated tags

class TagAcumulator
  constructor: (ch) ->
    @channel = ch
    # input
    @channel.subscribe 'accumulator:store', @store, @
    @channel.subscribe 'accumulator:delete-last', @delete_last, @
    # state
    @stored_tags = []
    # initialize
    @dom = @initialize_dom()
    @bind_events(@dom)

  # Operations

  store: (tag) ->
    @stored_tags.push tag
    @dom.tag_list.append @render(tag)

  delete_last: ->
    deleted = @stored_tags.pop()
    @dom.tag_list.find("[data-tag=#{deleted}]").remove()

  delete_tag: (tag) ->
    @stored_tags = _.without @stored_tags, tag

  # DOM

  initialize_dom: ->
    tag_list: $('#demo2-tag-list')

  bind_events: (dom) ->
    self = @
    dom.tag_list.delegate 'li.e-tag > a', 'click', (e) ->
      tag_element = $(this).closest('li.e-tag')
      self.delete_tag tag_element.attr('data-tag')
      tag_element.remove()

  render: (tag) ->
    $('<li/>')
      .addClass('e-tag')
      .attr('data-tag', tag)
      .text(tag)
      .append('<a href="#">x</a>')

# Show and manage the suggestion box

class TagSuggestion
  constructor: (ch) ->
    @channel = ch
    # input
    @channel.subscribe 'suggest:show',   @show,    @
    @channel.subscribe 'suggest:close',  @close,   @
    @channel.subscribe 'suggest:next',   @go_next, @
    @channel.subscribe 'suggest:prev',   @go_prev, @
    @channel.subscribe 'suggest:select', @select,  @
    # state
    @input                  = null
    @selected_index         = 0
    @available_values       = ["hola", "hello", "ahoy!", "bonjorno", "halo", "buenas", "akandemorl", "jarl"]
    @options_list           = []
    #init
    @dom = @initialize_dom()
    @bind_events(@dom)

  initialize_dom: ->
    suggestion_box: $('#demo2-suggestion-box')

  bind_events: (dom) ->
    self = @
    dom.suggestion_box.delegate 'li.e-suggestion', 'click', ->
      suggestion = $(this).attr('data-suggestion')
      self.select_suggestion(suggestion)

  show: (input) ->
    # Don't do anything if the input is the same
    return unless @input != input
    return @dom.suggestion_box.slideUp() if input.length == 0
    self = @
    @input = input
    @options_list = _.filter @available_values, (w) -> w.match(input)
    if @options_list.length > 0
      @dom.suggestion_box.html('')
      _.each @options_list, (s) -> self.dom.suggestion_box.append(self.render(s))
      @dom.suggestion_box.slideDown()
      @selected_index = -1
    else
      @dom.suggestion_box.slideUp()

  render: (s) ->
    $('<li/>').addClass('e-suggestion').attr('data-suggestion', s).text(s)

  close: ->
    @dom.suggestion_box.hide()

  go_next: ->
    @selected_index = Math.min(@options_list.length - 1, @selected_index + 1)
    @highlight_element()

  go_prev: ->
    @selected_index = Math.max(0, @selected_index - 1)
    @highlight_element()

  highlight_element: (n) ->
    n ||= @selected_index
    @dom.suggestion_box.find('li').css('color', '')
    @dom.suggestion_box.find("li:nth-child(#{n+1})").css('color', 'red')

  select: (selected) ->
    # select currently highlighted suggestion
    selected ||= @options_list[@selected_index]
    @channel.publish('suggest:selected', selected)
    @close_box()

# Input Dispatcher

class TagInput
  constructor: (ch) ->
    @channel = ch
    #input
    @channel.subscribe 'input:clear', (-> @dom.input.val('')), @
    # init
    @dom = @initialize_dom()
    @bind_events(@dom)

  initialize_dom: ->
      input: $('#demo2-input')

  bind_events: (dom) ->
    # Dispatch events based on keypresses
    self = @
    dom.input.keyup (e) ->
      value = self.dom.input.val()
      switch e.keyCode
        when 40     then self.channel.publish('suggest:next')
        when 38     then self.channel.publish('suggest:prev')
        when 32,188 then self.channel.publish('input:tag', value)
        when 13     then self.channel.publish('suggest:select')
        when 8      then self.channel.publish('accumulator:delete-last') if value.length == 0
      self.channel.publish('suggest:show', value)

# Parent Widget

class TagWidget
  constructor: ->
    # the decoupled components
    @channel     = new Channel()
    @input       = new TagInput(@channel)
    @accumulator = new TagAcumulator(@channel)
    @suggest     = new TagSuggestion(@channel)
    # input
    @channel.subscribe 'suggest:selected', @read_tag, @
    @channel.subscribe 'input:tag',        @read_tag, @

  read_tag: (input) ->
    value = input.trim().replace(/\W/g, '')
    # coordine the action
    @channel.publish('accumulator:store', value) unless value.length <= 0
    @channel.publish('suggest:close')
    @channel.publish('input:clear')

  selected_suggestion: (suggestion) ->
    @read_input(suggestion)

$ -> window.tag_input = new TagWidget()
