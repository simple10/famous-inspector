var transformTemplate = '<div class="side-pane">' + 
        '<div class="scale"><div class="famous-transform">Scale: </div><input value="0" class="famous-transform x"> <input value="0" class="famous-transform y"> <input value="0" class="famous-transform z"></div>' +

        '<div class="rotate"><div class="famous-transform">Rotate: </div><input value="0" class="famous-transform x"> <input value="0" class="famous-transform y"> <input value="0" class="famous-transform z"></div>' +

        ' <div class="translate"><div class="famous-transform">Translate: </div><input value="0" class="famous-transform x"> <input value="0" class="famous-transform y"> <input value="0" class="famous-transform z"></div>'
    +'</div>'

function TransformView(host) {
    this.container = host
    host.innerHTML = transformTemplate
        this.container.addEventListener('keyup', this.keydown.bind(this))
    this.loadData()
}

TransformView.prototype = {
    order: 'xyz',
    keydown: function (e) {
        var el = e.target
        var col = el.className[el.className.length -1]
        var row = el.parentElement.className
        var value = el.value
        DOMAgent.setFamousProperties(this.currentId, this.buildTransform())
    },
    buildTransform: function () {
        var transform = {
            scale: this.processRow(0),
            rotate: this.processRow(1),
            translate: this.processRow(2),
            skew: '0:0:0'
        }
        return transform
    },
    processRow: function (idx) {
        var spec = this.container.children[0].children
        var row = [].slice.call(spec[idx].children, 1)
        return row.map(function (input) { return input.value || 0 }).join(':')
        
    },
    loadData: function (id) {
        var self = this.container
        this.currentId = id
        DOMAgent.getSpec(id, function (err, data) {
            for(var k in data){
                var row = self.querySelector('.'  + k)
                if (! row) continue
                data[k].split(':').forEach(function (num, idx) {
                    row.children[idx + 1].value = num 
                })
            }
        })
    }
}


function makeRow() {
    return "Scale Rotate Translate".split(' ')
        .map(function (d) { return "<div class='" + d.toLowerCase() + "'>" +
                            "<div class='famous-transform'>" + d + ": </div>" + makeCol() + "</div>" })
        .join('')
}

function makeCol() {
    return "xyz".split('')
        .map(function (d) { return "<input value='0' class='famous-transform " + d + "'></input>" })
        .join(' ')
}
