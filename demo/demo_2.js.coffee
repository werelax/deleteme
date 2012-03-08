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
  constructor: (ch, options={}) ->
    @channel = ch
    # input
    @channel.subscribe 'accumulator:store', @store, @
    @channel.subscribe 'accumulator:delete-last', @delete_last, @
    # state
    @stored_tags = []
    # initialize
    @render = options.tag_render if options.tag_render?
    @dom = @initialize_dom()
    @bind_events(@dom)

  # Operations

  store: (tag) ->
    unless tag in @stored_tags
      @stored_tags.push tag
      @dom.tag_list.find('li:last').before @render(tag)

  delete_last: ->
    deleted = @stored_tags.pop()
    @dom.tag_list.find("[data-tag=#{deleted}]").remove()

  delete_tag: (tag) ->
    @stored_tags = _.without @stored_tags, tag

  # DOM

  initialize_dom: ->
    tag_list: $('.e-tgwd-list-store')

  bind_events: (dom) ->
    self = @
    dom.tag_list.delegate 'li.e-tag > a', 'click', (e) ->
      tag_element = $(this).closest('li.e-tag')
      self.delete_tag tag_element.attr('data-tag')
      tag_element.remove()

  render: (tag) ->
    $('<li/>').addClass('e-tag').attr('data-tag', tag).text(tag).append('<a href="#">x</a>')

# Show and manage the suggestion box

class TagSuggestion
  constructor: (ch, options={}) ->
    # REVIEW: classes
    @channel = ch
    # input
    @channel.subscribe 'suggest:show',   @show,    @
    @channel.subscribe 'suggest:close',  @close,   @
    @channel.subscribe 'suggest:next',   @go_next, @
    @channel.subscribe 'suggest:prev',   @go_prev, @
    @channel.subscribe 'suggest:select', @select,  @
    # state
    @input          = ""
    @selected_index = 0
    @options_list   = []
    # customizations
    @get_suggestions  = options.get_suggestions if options.get_suggestions?
    @available_values = options.suggestions || []
    @render           = options.suggest_render if options.suggest_render?
    #init
    @dom = @initialize_dom()
    @bind_events(@dom)

  # Operations

  get_suggestions: (input, cb) ->
    list = _.filter @available_values, (w) -> w.match(input)
    cb(list)

  go_next: ->
    @selected_index = Math.min(@options_list.length - 1, @selected_index + 1)
    @highlight_element()

  go_prev: ->
    @selected_index = Math.max(0, @selected_index - 1)
    @highlight_element()

  select: (selected) ->
    # select currently highlighted suggestion
    selected ||= @options_list[@selected_index]
    @channel.publish('suggest:selected', selected)
    @close()

  # DOM

  initialize_dom: ->
    suggestion_box: $('.e-tgwd-suggest-box')

  bind_events: (dom) ->
    self = @
    dom.suggestion_box.delegate 'li.e-suggestion', 'click', ->
      suggestion = $(this).attr('data-suggestion')
      self.select(suggestion)

  show: (input) ->
    # Don't do anything if the input is the same
    return unless @input != input
    return @dom.suggestion_box.slideUp() if $.trim(input).length == 0
    self = @
    @input = input
    @get_suggestions input, (options_list) ->
      self.options_list = options_list
      if options_list.length > 0
        self.dom.suggestion_box.html('')
        _.each options_list, (s) -> self.dom.suggestion_box.append(self.render(s))
        self.dom.suggestion_box.slideDown()
        self.selected_index = -1
      else
        self.dom.suggestion_box.slideUp()

  render: (s) ->
    $('<li/>').addClass('e-suggestion').attr('data-suggestion', s).text(s)

  close: ->
    @input = ""
    @dom.suggestion_box.hide()

  highlight_element: (n) ->
    n ||= @selected_index
    @dom.suggestion_box.find('li').removeClass('highlighted')
    @dom.suggestion_box.find("li:nth-child(#{n+1})").addClass('highlighted')

# Input Dispatcher

class TagInput
  # FACTORIZE: Selectors
  constructor: (ch, options) ->
    @channel = ch
    #input
    @channel.subscribe 'input:clear', (-> @dom.input.val('')), @
    # customization
    @suggest = _.debounce @_suggest, (options.debounce || 300)
    # init
    @dom = @initialize_dom()
    @bind_events(@dom)

  initialize_dom: ->
    input: $('.e-tgwd-input')

  _suggest: (value) ->
    @channel.publish('suggest:show', value)

  bind_events: (dom) ->
    # Dispatch events based on keypresses
    self = @

    dom.input.keydown (e) ->
      value = self.dom.input.val()
      switch e.keyCode
        when 8      then self.channel.publish('accumulator:delete-last') if value.length == 0

    dom.input.keyup (e) ->
      value = self.dom.input.val()
      switch e.keyCode
        when 40     then self.channel.publish('suggest:next')
        when 38     then self.channel.publish('suggest:prev')
        when 32,188 then self.channel.publish('input:tag', value)
        when 13     then self.channel.publish('suggest:select')
        else self.suggest(value)

    dom.input.blur ->
      value = self.dom.input.val()
      self.channel.publish('input:tag', value)

# Parent Widget

class TagWidget
  constructor: (options={}) ->
    throw new Error('Please give me an input!') unless (input = options.input)
    @wrap_input(input)
    # the decoupled components
    @channel     = new Channel()
    @input       = new TagInput(@channel, options)
    @accumulator = new TagAcumulator(@channel, options)
    @suggest     = new TagSuggestion(@channel, options)
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

  get_tags: ->
    @accumulator.stored_tags

  # DOM

  wrap_input: (selector) ->
    # Nasty...
    input        = $(selector).addClass('e-tgwd-input')
    surround_box = $('<div/>').addClass('e-tgwd-box')
    store        = $('<ul/>').addClass ('e-tgwd-list-store')
    input_li     = $('<li/>').addClass ('e-tgwd-input-li')
    suggest_box  = $('<ul/>').addClass ('e-tgwd-suggest-box')
    input.wrap(surround_box).wrap(store).wrap(input_li)
    $('.e-tgwd-box').append(suggest_box)


### HIPOTHETIC USE CASE
###

$ ->
  sugs = ['a']
  window.tw = new TagWidget
    input: '#demo2-input',
    suggestions: ['hey!', 'hello', 'aloha', 'bonjorno', 'hola!']
  # OR maybe better as a jQuery plugin?
  # $('#input-selector').tabWidget({options: (-> sugs), throttle: 0})

  $('.e-demo2-button').click -> console.log(tw.get_tags())
