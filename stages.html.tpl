<hr>
<div class="stage" id="stage_{{stage_id}}">
    <div>Dv : {{Dv}}m/s / {{FullDv}}m/s</div>
    <div>Burn time : {{burn}}s</div>
    <div>TWR : {{twr.min}} - {{twr.max}}</div>
    <div>Mass : {{totalMass}}t / {{MassLauncher}}t</div>
    <div>Stage Composition : 
        <ul>
            <li>on top decoupler : {{decoupler}}</li>
            <li>tanks : 
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