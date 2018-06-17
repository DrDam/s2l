<hr>
<div class="stage" id="stage_{{stage_id}}">
    <div>Dv : {{stageDv}}m/s / {{FullDv}}m/s</div>
    <div>Burn time : {{burn}}s</div>
    <div>TWR : {{twrMin}} - {{twrMax}}</div>
    <div>Mass : {{totalMass}}t / {{MassLauncher}}t</div>
    <div>Stage Composition : 
        <ul>
            <li>on top decoupler : {{decoupler}}</li>
            <li>Fuel Stack : 
                <ul>
                    {{#tanks}}
                        <li>{{tank_name}}</li>
                    {{/tanks}}    
                </ul>
            </li>
            <li>engine : {{engine}}</li>
        </ul>
    
    </div>
</div>