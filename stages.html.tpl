<hr>
<div class="stage" id="stage_{{stage_id}}">
    <div>Engine : {{engine}}</div>
    <div>Fuel Mass : {{mcarbu}}t</div>
    <div>TWR : {{twr.min}} - {{twr.max}}
    <div>Burn time : {{burn}}s</div>
    <div>Total Mass : {{totalMass}}t</div>
    <div>Dv : {{Dv}}m/s / {{FullDv}}m/S</div>
    <div>Compositions des reservoirs : 
        <ul>
            {{#tanks}}
  		<li>{{tank_name}}</li>
            {{/tanks}}    
        </ul>
    </div>
</div>