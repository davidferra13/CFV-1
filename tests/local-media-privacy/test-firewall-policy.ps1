$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../../scripts/local-media-privacy/firewall-policy.ps1')
function Fixture {
    return @{
        Rule = @{ Enabled='True'; Direction='Outbound'; Action='Block'; Profile='Any' }
        Application = @{ Package='Any' }
        Address = @{ LocalAddress='Any'; RemoteAddress='Any' }
        Port = @{ Protocol='Any'; LocalPort='Any'; RemotePort='Any' }
        Interface = @{ InterfaceAlias='Any' }
        InterfaceType = @{ InterfaceType='Any' }
        Service = @{ Service='Any' }
        Security = @{ Authentication='NotRequired'; LocalUser='Any'; RemoteUser='Any'; RemoteMachine='Any' }
    }
}
$fixture = Fixture
if (!(Test-UnrestrictedProgramBlock @fixture)) { throw 'Broad synthetic block should pass' }
$cases = @(
    @('Rule','Enabled','False'), @('Rule','Profile','Private'),
    @('Address','LocalAddress','192.0.2.10'), @('Address','RemoteAddress','192.0.2.0/24'),
    @('Port','Protocol','TCP'), @('Port','RemotePort','443'),
    @('Interface','InterfaceAlias','Wi-Fi'), @('InterfaceType','InterfaceType','Wireless'),
    @('Service','Service','fixture-service'), @('Security','LocalUser','fixture-user'),
    @('Application','Package','fixture-package')
)
foreach ($case in $cases) {
    $fixture = Fixture
    $fixture[$case[0]][$case[1]] = $case[2]
    if (Test-UnrestrictedProgramBlock @fixture) { throw 'Scoped synthetic block incorrectly passed' }
}
Write-Output 'Firewall policy fixtures: 12 passed; no live firewall was changed.'
